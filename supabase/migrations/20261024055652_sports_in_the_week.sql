-- Sports in the week (Pla → Setmana): padel, basketball… on a day, with
-- an optional time and duration, next to its routines. They count like a
-- routine everywhere: Today offers Fet / Salta, and a sport session shows
-- in History and Progress. Also a routine's short description, shown under
-- it in the week.

-- 1. A routine's description: "Esquena i bíceps".
alter table public.routines
  add column description text
    constraint routines_description_length check (char_length(description) <= 80);

-- 2. Sports planned on a weekday. The same sport can be on several days,
-- each with its own time. position orders a day's routines and sports
-- together (weekly_schedule.position is the same scale).
create table public.weekly_sports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  weekday smallint not null
    constraint weekly_sports_weekday_check check (weekday between 1 and 7),
  sport text not null
    constraint weekly_sports_sport_check check (sport in ('padel', 'tennis', 'football', 'basketball', 'volleyball', 'climbing', 'hiking', 'swimming', 'cycling', 'yoga', 'dance', 'other')),
  -- "Other" with a name of your own.
  custom_name text
    constraint weekly_sports_custom_name_check check (
      (sport = 'other') = (custom_name is not null)
      and char_length(custom_name) between 1 and 40
    ),
  -- When it starts ("19:00") and how long it lasts, if you say.
  start_time time,
  duration_s integer
    constraint weekly_sports_duration_check check (duration_s between 60 and 86400),
  position integer not null default 0
    constraint weekly_sports_position_check check (position >= 0),
  created_at timestamptz not null default now()
);

create index weekly_sports_user_weekday_idx on public.weekly_sports (user_id, weekday, position);

alter table public.weekly_sports enable row level security;

create policy "Users can read their own sports"
  on public.weekly_sports for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can plan their own sports"
  on public.weekly_sports for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users can change their own sports"
  on public.weekly_sports for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Users can take sports off their week"
  on public.weekly_sports for delete to authenticated
  using (user_id = (select auth.uid()));

-- 3. A sport session: done (or skipped) for a planned sport. Its sport is
-- copied, so History keeps it if the plan changes (data rule 1).
alter table public.workout_sessions
  add column planned_sport_id uuid references public.weekly_sports (id) on delete set null,
  add column sport text
    constraint workout_sessions_sport_check check (sport in ('padel', 'tennis', 'football', 'basketball', 'volleyball', 'climbing', 'hiking', 'swimming', 'cycling', 'yoga', 'dance', 'other')),
  add column sport_name text
    constraint workout_sessions_sport_name_length check (char_length(sport_name) <= 40),
  add constraint workout_sessions_routine_or_sport check (routine_id is null or sport is null);

-- The session policies also check a planned sport is your own (under its
-- RLS, others' aren't visible).
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
  );

-- 4. save_routine() also takes the description; its arguments change, so
-- it's dropped and created again. A day it's added to puts it after the
-- day's routines and sports.
drop function public.save_routine(uuid, text, text, text, integer, text, smallint[], jsonb);

create function public.save_routine(
  p_id uuid,
  p_name text,
  p_label text,
  p_custom_label text,
  p_planned_duration_s integer,
  p_notes text,
  p_weekdays smallint[],
  p_exercises jsonb,
  p_description text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_routine_id uuid := coalesce(p_id, gen_random_uuid());
  v_weekdays smallint[] := coalesce(p_weekdays, '{}');
  v_item jsonb;
  v_position integer;
  v_exercise_id uuid;
begin
  insert into public.routines
    (id, user_id, name, label, custom_label, planned_duration_s, notes, description)
  values (
    v_routine_id,
    auth.uid(),
    trim(p_name),
    p_label,
    case when p_label = 'custom' then nullif(trim(p_custom_label), '') end,
    p_planned_duration_s,
    nullif(trim(p_notes), ''),
    nullif(trim(p_description), '')
  )
  on conflict (id) do update
    set name = excluded.name,
        label = excluded.label,
        custom_label = excluded.custom_label,
        planned_duration_s = excluded.planned_duration_s,
        notes = excluded.notes,
        description = excluded.description;

  delete from public.routine_exercises re
  where re.routine_id = v_routine_id
    and re.id not in (
      select (item ->> 'id')::uuid
      from jsonb_array_elements(p_exercises) as item
      where item ->> 'id' is not null
    );

  for v_item, v_position in
    select list.item, (list.ordinality - 1)::integer
    from jsonb_array_elements(p_exercises) with ordinality as list(item, ordinality)
  loop
    if jsonb_array_length(coalesce(v_item -> 'sets', '[]'::jsonb)) = 0 then
      raise exception 'Every exercise in a routine needs at least one set.';
    end if;

    v_exercise_id := null;
    insert into public.routine_exercises
      (id, routine_id, exercise_id, position, group_key, rest_s, notes)
    values (
      coalesce((v_item ->> 'id')::uuid, gen_random_uuid()),
      v_routine_id,
      (v_item ->> 'exercise_id')::uuid,
      v_position,
      v_item ->> 'group_key',
      (v_item ->> 'rest_s')::integer,
      v_item ->> 'notes'
    )
    on conflict (id) do update
      set exercise_id = excluded.exercise_id,
          position = excluded.position,
          group_key = excluded.group_key,
          rest_s = excluded.rest_s,
          notes = excluded.notes
      -- Never move a row that belongs to another routine.
      where public.routine_exercises.routine_id = excluded.routine_id
    returning id into v_exercise_id;

    if v_exercise_id is null then
      raise exception 'Routine exercise % belongs to another routine.', v_item ->> 'id';
    end if;

    delete from public.routine_sets rs where rs.routine_exercise_id = v_exercise_id;

    insert into public.routine_sets (
      routine_exercise_id, position,
      target_weight_kg, target_reps, target_duration_s, target_distance_m,
      target_speed_kmh, target_incline_pct, target_level
    )
    select
      v_exercise_id,
      (sets.ordinality - 1)::integer,
      (sets.item ->> 'target_weight_kg')::numeric,
      (sets.item ->> 'target_reps')::integer,
      (sets.item ->> 'target_duration_s')::integer,
      (sets.item ->> 'target_distance_m')::integer,
      (sets.item ->> 'target_speed_kmh')::numeric,
      (sets.item ->> 'target_incline_pct')::numeric,
      (sets.item ->> 'target_level')::integer
    from jsonb_array_elements(v_item -> 'sets') with ordinality as sets(item, ordinality);
  end loop;

  delete from public.weekly_schedule ws
  where ws.routine_id = v_routine_id
    and not (ws.weekday = any (v_weekdays));

  insert into public.weekly_schedule (routine_id, weekday, user_id, position)
  select
    v_routine_id,
    day.weekday,
    auth.uid(),
    coalesce(
      greatest(
        (
          select max(ws.position) + 1
          from public.weekly_schedule ws
          where ws.user_id = auth.uid() and ws.weekday = day.weekday
        ),
        (
          select max(sp.position) + 1
          from public.weekly_sports sp
          where sp.user_id = auth.uid() and sp.weekday = day.weekday
        )
      ),
      0
    )
  from (select distinct unnest(v_weekdays) as weekday) as day
  on conflict (routine_id, weekday) do nothing;

  return v_routine_id;
end;
$$;

revoke execute on function public.save_routine(uuid, text, text, text, integer, text, smallint[], jsonb, text) from public, anon;
grant execute on function public.save_routine(uuid, text, text, text, integer, text, smallint[], jsonb, text) to authenticated;

-- 5. A day's new order after a drag, routines and sports together, in one
-- transaction: p_items is the day's list in order, [{ kind: 'routine' |
-- 'sport', id }] (a routine by its id). Caller's rights: RLS keeps it to
-- your own rows.
create function public.reorder_day(p_weekday smallint, p_items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_position integer;
begin
  for v_item, v_position in
    select list.item, (list.ordinality - 1)::integer
    from jsonb_array_elements(p_items) with ordinality as list(item, ordinality)
  loop
    if v_item ->> 'kind' = 'routine' then
      update public.weekly_schedule ws
      set position = v_position
      where ws.routine_id = (v_item ->> 'id')::uuid and ws.weekday = p_weekday;
    else
      update public.weekly_sports sp
      set position = v_position
      where sp.id = (v_item ->> 'id')::uuid and sp.weekday = p_weekday;
    end if;
  end loop;
end;
$$;

revoke execute on function public.reorder_day(smallint, jsonb) from public, anon;
grant execute on function public.reorder_day(smallint, jsonb) to authenticated;

-- 6. finish_workout() keeps a session's sport (same argument, replaced in
-- place).
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
    planned_sport_id, sport, sport_name
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
    nullif(trim(p_session ->> 'sport_name'), '')
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
        sport_name = excluded.sport_name
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

-- 7. workout_summaries() returns each session's sport too; its result
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
