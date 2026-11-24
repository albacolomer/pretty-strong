-- US-29: adding something to one week only, from "Planifica la setmana que
-- ve" → "+ Afegeix". A routine or a sport on a real date, on top of the
-- usual week (weekly_schedule, weekly_sports), which is never changed.
-- Moves (schedule_overrides) only move or drop what the usual week plans;
-- an addition comes from nowhere, so it gets a table of its own.

-- 1. What's added to a date: a routine, or a sport with its time and
-- duration, like weekly_sports.
create table public.schedule_additions (
  -- Made on the phone, so "Desfés" can put back the same row.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  routine_id uuid references public.routines (id),
  sport text
    constraint schedule_additions_sport_check check (sport in ('padel', 'tennis', 'football', 'basketball', 'volleyball', 'climbing', 'hiking', 'swimming', 'cycling', 'yoga', 'dance', 'other')),
  -- "Other" with a name of your own.
  custom_name text
    constraint schedule_additions_custom_name_check check (char_length(custom_name) between 1 and 40),
  start_time time,
  duration_s integer
    constraint schedule_additions_duration_check check (duration_s between 60 and 86400),
  -- Its place on the day, on the same scale as weekly_schedule's.
  position integer not null default 0
    constraint schedule_additions_position_check check (position >= 0),
  created_at timestamptz not null default now(),
  -- A routine or a sport, never both or neither.
  constraint schedule_additions_one_thing check ((routine_id is null) <> (sport is null)),
  -- A name exactly for "other"; a time and duration only for a sport.
  -- (A case, so a null never lets a wrong row through.)
  constraint schedule_additions_sport_details check (
    case
      when sport is null then custom_name is null
      else (sport = 'other') = (custom_name is not null)
    end
  ),
  constraint schedule_additions_routine_details check (
    routine_id is null or (start_time is null and duration_s is null)
  ),
  -- A routine is added once a day (sports can be twice: two classes).
  constraint schedule_additions_routine_once unique (user_id, routine_id, date)
);

create index schedule_additions_user_date_idx on public.schedule_additions (user_id, date);

alter table public.schedule_additions enable row level security;

-- Your own rows, for your own routines (RLS on routines makes the exists
-- true only for yours).
create policy "Users can read their own week additions"
  on public.schedule_additions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users can add to their own week"
  on public.schedule_additions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (select 1 from public.routines r where r.id = routine_id))
  );
create policy "Users can change their own week additions"
  on public.schedule_additions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (select 1 from public.routines r where r.id = routine_id))
  );
create policy "Users can take additions off their week"
  on public.schedule_additions for delete to authenticated
  using (user_id = (select auth.uid()));

-- 2. Every addition between p_from and p_to, replaced in one transaction,
-- like replace_schedule_overrides(): "Torna a l'habitual" clears them, a
-- shift moves several at once, and "Desfés" puts the previous ones back
-- exactly. p_additions: [{ id, date, routine_id, sport, custom_name,
-- start_time, duration_s, position }], each dated in that range. Caller's
-- rights: RLS keeps it to your own rows.
create function public.replace_schedule_additions(p_from date, p_to date, p_additions jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_to < p_from or p_to - p_from > 14 then
    raise exception 'replace_schedule_additions: % to % is not a week', p_from, p_to;
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_additions) a
    where (a ->> 'date')::date not between p_from and p_to
  ) then
    raise exception 'replace_schedule_additions: an addition outside % to %', p_from, p_to;
  end if;

  delete from public.schedule_additions a
  where a.user_id = (select auth.uid()) and a.date between p_from and p_to;

  insert into public.schedule_additions (
    id, date, routine_id, sport, custom_name, start_time, duration_s, position
  )
  select
    coalesce((a ->> 'id')::uuid, gen_random_uuid()),
    (a ->> 'date')::date,
    (a ->> 'routine_id')::uuid,
    a ->> 'sport',
    nullif(trim(a ->> 'custom_name'), ''),
    (a ->> 'start_time')::time,
    (a ->> 'duration_s')::integer,
    coalesce((a ->> 'position')::integer, 0)
  from jsonb_array_elements(p_additions) a;
end;
$$;

revoke execute on function public.replace_schedule_additions(date, date, jsonb) from public, anon;
grant execute on function public.replace_schedule_additions(date, date, jsonb) to authenticated;

-- 3. A sport added for one week is marked done or skipped on Avui like a
-- planned one: its session says which addition it was for. If the
-- addition goes, the session stays in History.
alter table public.workout_sessions
  add column planned_addition_id uuid references public.schedule_additions (id) on delete set null;

-- 4. The session policies also check a planned addition is your own.
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
    and (planned_addition_id is null
      or exists (select 1 from public.schedule_additions a where a.id = planned_addition_id))
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
    and (planned_addition_id is null
      or exists (select 1 from public.schedule_additions a where a.id = planned_addition_id))
  );

-- 5. finish_workout() keeps a session's addition too, so editing it in
-- History (or "Desfés" after deleting it) doesn't lose it. Same argument,
-- replaced in place; otherwise as in 20261111131218_how_you_felt.sql.
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
    planned_event_id, event_kind, event_name,
    planned_addition_id
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
    nullif(trim(p_session ->> 'event_name'), ''),
    -- Kept only if that addition still exists.
    (
      select a.id from public.schedule_additions a
      where a.id = (p_session ->> 'planned_addition_id')::uuid
    )
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
        event_name = excluded.event_name,
        planned_addition_id = excluded.planned_addition_id
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
