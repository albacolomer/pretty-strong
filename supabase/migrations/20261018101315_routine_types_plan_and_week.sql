-- Routine redesign (US-07, US-09): routine types, a planned duration, a
-- first-time plan per exercise, and the days of the week each routine is
-- done on. save_routine() saves all of it in one transaction.

-- 1. Types: strength, run, hybrid (was hyrox), class, custom (was other).
alter table public.routines drop constraint routines_label_check;

update public.routines set label = 'hybrid' where label = 'hyrox';
update public.routines set label = 'custom' where label = 'other';

alter table public.routines
  add constraint routines_label_check
    check (label in ('strength', 'run', 'hybrid', 'class', 'custom')),
  -- The name you give a custom type, e.g. "Natació". Only custom ones have it.
  add column custom_label text
    constraint routines_custom_label_check check (char_length(trim(custom_label)) between 1 and 30),
  add constraint routines_custom_label_only_custom
    check (label = 'custom' or custom_label is null),
  -- How long it's planned to last, e.g. a 50-minute class. Optional.
  add column planned_duration_s integer
    constraint routines_planned_duration_check check (planned_duration_s between 60 and 36000);

-- 2. The first-time plan: the numbers the first workout of this routine
-- starts from; after that, last time's (spec: "Last time" lookup). Only
-- the columns the exercise's tracking type uses are filled; units in the
-- names (data rule 6).
alter table public.routine_exercises
  add column target_weight_kg numeric(6, 2)
    constraint routine_exercises_target_weight_check check (target_weight_kg between 0 and 1000),
  add column target_reps integer
    constraint routine_exercises_target_reps_check check (target_reps between 1 and 1000),
  add column target_duration_s integer
    constraint routine_exercises_target_duration_check check (target_duration_s between 1 and 86400),
  add column target_distance_m integer
    constraint routine_exercises_target_distance_check check (target_distance_m between 1 and 1000000),
  add column target_speed_kmh numeric(4, 1)
    constraint routine_exercises_target_speed_check check (target_speed_kmh between 0 and 60),
  add column target_incline_pct numeric(4, 1)
    constraint routine_exercises_target_incline_check check (target_incline_pct between -10 and 40),
  add column target_level integer
    constraint routine_exercises_target_level_check check (target_level between 1 and 100);

-- 3. The week: one row per routine planned on a weekday (1 = Monday …
-- 7 = Sunday). A day can have several routines, ordered by position; a day
-- without rows is a rest day. user_id is stored too, so "my week" is one
-- simple query.
create table public.weekly_schedule (
  routine_id uuid not null references public.routines (id) on delete cascade,
  weekday smallint not null
    constraint weekly_schedule_weekday_check check (weekday between 1 and 7),
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null default 0
    constraint weekly_schedule_position_check check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (routine_id, weekday)
);

create index weekly_schedule_user_weekday_idx on public.weekly_schedule (user_id, weekday, position);

-- Row Level Security: your own rows only, and only for your own routines.
alter table public.weekly_schedule enable row level security;

create policy "Users can read their own week"
  on public.weekly_schedule for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can plan their own routines"
  on public.weekly_schedule for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can reorder their own week"
  on public.weekly_schedule for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );

-- Taking a routine off a day deletes that plan row; workouts done on that
-- day are kept in their own tables.
create policy "Users can take routines off their week"
  on public.weekly_schedule for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- 4. save_routine() takes the new fields, so its arguments change: the old
-- version is replaced. Nothing else calls it.
drop function public.save_routine(uuid, text, text, text, jsonb);

-- Saves a routine, its whole exercise list and its weekdays in one
-- transaction, so it's never half-saved. p_id null creates a new routine.
-- p_exercises is the list in order: [{ id?, exercise_id, planned_sets,
-- rest_s, group_key, notes, target_weight_kg, target_reps,
-- target_duration_s, target_distance_m, target_speed_kmh,
-- target_incline_pct, target_level }]. Items with an id keep it (past
-- workouts will link to it); items without one are new; rows left out were
-- removed. p_weekdays is the full list of days (1–7); a newly added day
-- puts the routine last on it. Runs with the caller's rights, so all the
-- RLS policies above apply.
create function public.save_routine(
  p_id uuid,
  p_name text,
  p_label text,
  p_custom_label text,
  p_planned_duration_s integer,
  p_notes text,
  p_weekdays smallint[],
  p_exercises jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_routine_id uuid := coalesce(p_id, gen_random_uuid());
  v_weekdays smallint[] := coalesce(p_weekdays, '{}');
begin
  insert into public.routines
    (id, user_id, name, label, custom_label, planned_duration_s, notes)
  values (
    v_routine_id,
    auth.uid(),
    trim(p_name),
    p_label,
    case when p_label = 'custom' then nullif(trim(p_custom_label), '') end,
    p_planned_duration_s,
    nullif(trim(p_notes), '')
  )
  on conflict (id) do update
    set name = excluded.name,
        label = excluded.label,
        custom_label = excluded.custom_label,
        planned_duration_s = excluded.planned_duration_s,
        notes = excluded.notes;

  delete from public.routine_exercises re
  where re.routine_id = v_routine_id
    and re.id not in (
      select (item ->> 'id')::uuid
      from jsonb_array_elements(p_exercises) as item
      where item ->> 'id' is not null
    );

  insert into public.routine_exercises (
    id, routine_id, exercise_id, position, group_key, planned_sets, rest_s, notes,
    target_weight_kg, target_reps, target_duration_s, target_distance_m,
    target_speed_kmh, target_incline_pct, target_level
  )
  select
    coalesce((list.item ->> 'id')::uuid, gen_random_uuid()),
    v_routine_id,
    (list.item ->> 'exercise_id')::uuid,
    (list.ordinality - 1)::integer,
    list.item ->> 'group_key',
    coalesce((list.item ->> 'planned_sets')::integer, 3),
    (list.item ->> 'rest_s')::integer,
    list.item ->> 'notes',
    (list.item ->> 'target_weight_kg')::numeric,
    (list.item ->> 'target_reps')::integer,
    (list.item ->> 'target_duration_s')::integer,
    (list.item ->> 'target_distance_m')::integer,
    (list.item ->> 'target_speed_kmh')::numeric,
    (list.item ->> 'target_incline_pct')::numeric,
    (list.item ->> 'target_level')::integer
  from jsonb_array_elements(p_exercises) with ordinality as list(item, ordinality)
  on conflict (id) do update
    set exercise_id = excluded.exercise_id,
        position = excluded.position,
        group_key = excluded.group_key,
        planned_sets = excluded.planned_sets,
        rest_s = excluded.rest_s,
        notes = excluded.notes,
        target_weight_kg = excluded.target_weight_kg,
        target_reps = excluded.target_reps,
        target_duration_s = excluded.target_duration_s,
        target_distance_m = excluded.target_distance_m,
        target_speed_kmh = excluded.target_speed_kmh,
        target_incline_pct = excluded.target_incline_pct,
        target_level = excluded.target_level
    -- Never move a row that belongs to another routine.
    where public.routine_exercises.routine_id = excluded.routine_id;

  delete from public.weekly_schedule ws
  where ws.routine_id = v_routine_id
    and not (ws.weekday = any (v_weekdays));

  insert into public.weekly_schedule (routine_id, weekday, user_id, position)
  select
    v_routine_id,
    day.weekday,
    auth.uid(),
    coalesce(
      (
        select max(ws.position) + 1
        from public.weekly_schedule ws
        where ws.user_id = auth.uid() and ws.weekday = day.weekday
      ),
      0
    )
  from (select distinct unnest(v_weekdays) as weekday) as day
  on conflict (routine_id, weekday) do nothing;

  return v_routine_id;
end;
$$;

revoke execute on function public.save_routine(uuid, text, text, text, integer, text, smallint[], jsonb)
  from public, anon;
grant execute on function public.save_routine(uuid, text, text, text, integer, text, smallint[], jsonb)
  to authenticated;
