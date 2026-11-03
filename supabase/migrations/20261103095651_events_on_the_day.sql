-- US-30: on its day, a competition or special date is on Avui like a
-- planned sport: Fet (logged with its time and a note) or Salta. Its
-- session counts as a workout. Like a sport's, it keeps its own copy of the
-- event's kind and name (data rule 1), so History still knows it if the
-- event is changed or deleted.

-- 1. An event's session: the event it was for, and what it was.
alter table public.workout_sessions
  add column planned_event_id uuid references public.events (id) on delete set null,
  add column event_kind text
    constraint workout_sessions_event_kind_check check (
      event_kind in ('marathon', 'half_marathon', 'race', 'trail', 'hyrox', 'spartan', 'triathlon', 'other')
    ),
  -- Null: the kind's name is shown (as on the event).
  add column event_name text
    constraint workout_sessions_event_name_length check (char_length(event_name) between 1 and 60),
  -- A session is a routine's, a sport's or an event's, never two.
  add constraint workout_sessions_event_alone check (
    event_kind is null or (routine_id is null and sport is null)
  );

-- 2. The session policies also check a planned event is your own (under
-- its RLS, others' aren't visible).
drop policy "Users can log their own sessions" on public.workout_sessions;
drop policy "Users can change their own sessions" on public.workout_sessions;

create policy "Users can log their own sessions"
  on public.workout_sessions for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (planned_routine_id is null
      or exists (select 1 from public.routines r where r.id = planned_routine_id))
    and (routine_id is null
      or exists (select 1 from public.routines r where r.id = routine_id))
    and (planned_sport_id is null
      or exists (select 1 from public.weekly_sports s where s.id = planned_sport_id))
    and (planned_event_id is null
      or exists (select 1 from public.events e where e.id = planned_event_id))
  );

create policy "Users can change their own sessions"
  on public.workout_sessions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (planned_routine_id is null
      or exists (select 1 from public.routines r where r.id = planned_routine_id))
    and (routine_id is null
      or exists (select 1 from public.routines r where r.id = routine_id))
    and (planned_sport_id is null
      or exists (select 1 from public.weekly_sports s where s.id = planned_sport_id))
    and (planned_event_id is null
      or exists (select 1 from public.events e where e.id = planned_event_id))
  );

-- 3. finish_workout() keeps a session's event too, so editing it in
-- History (or "Desfés" after deleting it) doesn't lose it. Same argument,
-- replaced in place.
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
    log_mode, started_at, ended_at, duration_s, energy, notes,
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
    (p_session ->> 'energy')::smallint,
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
        energy = excluded.energy,
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

-- 4. workout_summaries() returns each session's event too; its result
-- gains columns, so it's dropped and created again.
drop function public.workout_summaries(date, date);

create function public.workout_summaries(p_from date default null, p_to date default null)
returns table (
  id uuid,
  date date,
  routine_id uuid,
  routine_name text,
  routine_label text,
  routine_custom_label text,
  sport text,
  sport_name text,
  event_kind text,
  event_name text,
  log_mode text,
  duration_s integer,
  exercises integer,
  sets integer,
  volume_kg numeric,
  distance_m integer,
  run_distance_m integer,
  pace_distance_m integer,
  pace_duration_s integer
)
language sql
stable
set search_path = ''
as $$
  select
    ws.id,
    ws.date,
    ws.routine_id,
    r.name,
    r.label,
    r.custom_label,
    ws.sport,
    ws.sport_name,
    ws.event_kind,
    ws.event_name,
    ws.log_mode,
    coalesce(
      ws.duration_s,
      extract(epoch from ws.ended_at - ws.started_at)::integer
    ),
    coalesce(totals.exercises, 0)::integer,
    coalesce(totals.sets, 0)::integer,
    coalesce(totals.volume_kg, 0),
    coalesce(totals.distance_m, 0)::integer,
    coalesce(totals.run_distance_m, 0)::integer,
    coalesce(totals.pace_distance_m, 0)::integer,
    coalesce(totals.pace_duration_s, 0)::integer
  from public.workout_sessions ws
  left join public.routines r on r.id = ws.routine_id
  left join lateral (
    select
      count(distinct se.id) as exercises,
      count(s.id) as sets,
      sum(s.weight_kg * s.reps) as volume_kg,
      sum(s.distance_m) filter (where e.tracking_type in ('run', 'cardio_machine')) as distance_m,
      sum(s.distance_m) filter (where e.tracking_type = 'run') as run_distance_m,
      sum(s.distance_m) filter (
        where e.tracking_type = 'run' and s.distance_m > 0 and s.duration_s > 0
      ) as pace_distance_m,
      sum(s.duration_s) filter (
        where e.tracking_type = 'run' and s.distance_m > 0 and s.duration_s > 0
      ) as pace_duration_s
    from public.session_exercises se
    join public.sets s on s.session_exercise_id = se.id
    join public.exercises e on e.id = se.exercise_id
    where se.session_id = ws.id
  ) as totals on true
  where ws.status = 'completed'
    and (p_from is null or ws.date >= p_from)
    and (p_to is null or ws.date <= p_to)
  order by ws.date desc, ws.created_at desc;
$$;

revoke execute on function public.workout_summaries(date, date) from public, anon;
grant execute on function public.workout_summaries(date, date) to authenticated;
