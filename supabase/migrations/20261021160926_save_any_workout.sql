-- US-23, US-24: finish_workout() saves any finished workout, not only a
-- live one: a past workout edited in History, a quick log given its
-- exercises later, one logged after the fact, and one put back with
-- "Desfés" after deleting it. It now also takes log_mode ('live', the
-- default, or 'quick') and duration_s (a quick log's length; live ones use
-- started_at and ended_at). Same argument, so it's replaced in place; the
-- rest is as in 20261018204144_create_session_exercises_and_sets.sql:
-- one transaction, a retry replaces rather than copies, caller's rights.
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
    log_mode, started_at, ended_at, duration_s, energy, notes
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
    (p_session ->> 'energy')::smallint,
    nullif(trim(p_session ->> 'notes'), '')
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
        energy = excluded.energy,
        notes = excluded.notes
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
