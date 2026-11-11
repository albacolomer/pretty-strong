-- US-21: "Com t'has sentit?" from 0 to 10 at the end of a workout, in
-- place of energy from 1 to 5. The old energy is copied over doubled
-- (1 → 2, 5 → 10) so History has one scale; the energy column stays, as
-- it was, and is no longer written.

-- 1. How you felt, 0 (awful) to 10 (amazing); optional.
alter table public.workout_sessions
  add column feeling smallint
    constraint workout_sessions_feeling_check check (feeling between 0 and 10);

update public.workout_sessions
  set feeling = energy * 2
  where energy is not null;

-- 2. finish_workout() saves the feeling instead of the energy, and leaves
-- an edited session's old energy alone. Same argument, replaced in place.
create or replace function public.finish_workout(p_session jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_session_id uuid := (p_session ->> 'id')::uuid;
begin
  insert into public.workout_sessions (
    id, user_id, date, planned_routine_id, routine_id, change_reason, status,
    log_mode, started_at, ended_at, duration_s, feeling, notes,
    planned_sport_id, sport, sport_name,
    planned_event_id, event_kind, event_name
  )
  values (
    v_session_id,
    auth.uid(),
    (p_session ->> 'date')::date,
    (p_session ->> 'planned_routine_id')::uuid,
    (p_session ->> 'routine_id')::uuid,
    p_session ->> 'change_reason',
    'completed',
    coalesce(p_session ->> 'log_mode', 'live'),
    (p_session ->> 'started_at')::timestamptz,
    (p_session ->> 'ended_at')::timestamptz,
    (p_session ->> 'duration_s')::integer,
    (p_session ->> 'feeling')::smallint,
    nullif(trim(p_session ->> 'notes'), ''),
    (p_session ->> 'planned_sport_id')::uuid,
    p_session ->> 'sport',
    nullif(trim(p_session ->> 'sport_name'), ''),
    -- Kept only if that event still exists.
    (select e.id from public.events e where e.id = (p_session ->> 'planned_event_id')::uuid),
    p_session ->> 'event_kind',
    nullif(trim(p_session ->> 'event_name'), '')
  )
  on conflict (id) do update
    set date = excluded.date,
        planned_routine_id = excluded.planned_routine_id,
        routine_id = excluded.routine_id,
        change_reason = excluded.change_reason,
        status = excluded.status,
        log_mode = excluded.log_mode,
        started_at = excluded.started_at,
        ended_at = excluded.ended_at,
        duration_s = excluded.duration_s,
        feeling = excluded.feeling,
        notes = excluded.notes,
        planned_sport_id = excluded.planned_sport_id,
        sport = excluded.sport,
        sport_name = excluded.sport_name,
        planned_event_id = excluded.planned_event_id,
        event_kind = excluded.event_kind,
        event_name = excluded.event_name
    -- Never take over someone else's session.
    where public.workout_sessions.user_id = auth.uid();

  if not found then
    raise exception 'Workout session % belongs to someone else.', v_session_id;
  end if;

  -- A retry replaces the exercises and sets it sent before (their sets go
  -- with them, on delete cascade).
  delete from public.session_exercises se where se.session_id = v_session_id;

  insert into public.session_exercises (
    id, session_id, exercise_id, routine_exercise_id, position, group_key,
    rest_s, change, swapped_from_id, change_reason, notes
  )
  select
    (list.item ->> 'id')::uuid,
    v_session_id,
    (list.item ->> 'exercise_id')::uuid,
    -- Kept only if that routine exercise still exists.
    (
      select re.id from public.routine_exercises re
      where re.id = (list.item ->> 'routine_exercise_id')::uuid
    ),
    (list.ordinality - 1)::integer,
    list.item ->> 'group_key',
    (list.item ->> 'rest_s')::integer,
    list.item ->> 'change',
    (list.item ->> 'swapped_from_id')::uuid,
    list.item ->> 'change_reason',
    nullif(trim(list.item ->> 'notes'), '')
  from jsonb_array_elements(coalesce(p_session -> 'exercises', '[]'::jsonb))
    with ordinality as list(item, ordinality);

  insert into public.sets (
    id, session_exercise_id, position, set_type, weight_kg, reps, duration_s,
    distance_m, speed_kmh, incline_pct, level, rpe, completed_at
  )
  select
    (sets.item ->> 'id')::uuid,
    (list.item ->> 'id')::uuid,
    (sets.ordinality - 1)::integer,
    coalesce(sets.item ->> 'set_type', 'normal'),
    (sets.item ->> 'weight_kg')::numeric,
    (sets.item ->> 'reps')::integer,
    (sets.item ->> 'duration_s')::integer,
    (sets.item ->> 'distance_m')::integer,
    (sets.item ->> 'speed_kmh')::numeric,
    (sets.item ->> 'incline_pct')::numeric,
    (sets.item ->> 'level')::integer,
    (sets.item ->> 'rpe')::numeric,
    (sets.item ->> 'completed_at')::timestamptz
  from jsonb_array_elements(coalesce(p_session -> 'exercises', '[]'::jsonb)) as list(item)
  cross join lateral jsonb_array_elements(coalesce(list.item -> 'sets', '[]'::jsonb))
    with ordinality as sets(item, ordinality);

  return v_session_id;
end;
$$;
