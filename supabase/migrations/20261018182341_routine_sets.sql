-- One row per planned set (US-07, US-13), like Hevy: each set of a routine
-- exercise has its own first-time plan, so a pyramid (12 × 40 kg, 10 × 45,
-- 8 × 50) can be planned. The number of sets is now the number of rows, so
-- planned_sets and the per-exercise target_* columns go (data rule 2:
-- nothing stored that can be counted).

create table public.routine_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises (id) on delete cascade,
  position integer not null
    constraint routine_sets_position_check check (position >= 0),
  -- The first-time plan for this set: the numbers the first workout of the
  -- routine starts from; after that, last time's. Only the columns the
  -- exercise's tracking type uses are filled; units in the names (rule 6).
  target_weight_kg numeric(6, 2)
    constraint routine_sets_target_weight_check check (target_weight_kg between 0 and 1000),
  target_reps integer
    constraint routine_sets_target_reps_check check (target_reps between 1 and 1000),
  target_duration_s integer
    constraint routine_sets_target_duration_check check (target_duration_s between 1 and 86400),
  target_distance_m integer
    constraint routine_sets_target_distance_check check (target_distance_m between 1 and 1000000),
  target_speed_kmh numeric(4, 1)
    constraint routine_sets_target_speed_check check (target_speed_kmh between 0 and 60),
  target_incline_pct numeric(4, 1)
    constraint routine_sets_target_incline_check check (target_incline_pct between -10 and 40),
  target_level integer
    constraint routine_sets_target_level_check check (target_level between 1 and 100),
  created_at timestamptz not null default now(),
  constraint routine_sets_position_unique unique (routine_exercise_id, position)
);

-- Row Level Security: through the routine exercise and its routine, like
-- routine_exercises itself.
alter table public.routine_sets enable row level security;

create policy "Users can read their routines' sets"
  on public.routine_sets for select
  to authenticated
  using (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can plan sets in their routines"
  on public.routine_sets for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can change their routines' sets"
  on public.routine_sets for update
  to authenticated
  using (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can remove sets from their routines"
  on public.routine_sets for delete
  to authenticated
  using (
    exists (
      select 1
      from public.routine_exercises re
      join public.routines r on r.id = re.routine_id
      where re.id = routine_exercise_id and r.user_id = (select auth.uid())
    )
  );

-- Existing routines: an exercise with 4 planned sets and a plan becomes 4
-- rows with that plan, so nothing is lost.
insert into public.routine_sets (
  routine_exercise_id, position,
  target_weight_kg, target_reps, target_duration_s, target_distance_m,
  target_speed_kmh, target_incline_pct, target_level
)
select
  re.id, s.position,
  re.target_weight_kg, re.target_reps, re.target_duration_s, re.target_distance_m,
  re.target_speed_kmh, re.target_incline_pct, re.target_level
from public.routine_exercises re
cross join lateral generate_series(0, re.planned_sets - 1) as s(position);

alter table public.routine_exercises
  drop column planned_sets,
  drop column target_weight_kg,
  drop column target_reps,
  drop column target_duration_s,
  drop column target_distance_m,
  drop column target_speed_kmh,
  drop column target_incline_pct,
  drop column target_level;

-- save_routine() keeps its arguments; each item of p_exercises now brings
-- its sets: [{ id?, exercise_id, rest_s, group_key, notes, sets: [{
-- target_weight_kg, target_reps, target_duration_s, target_distance_m,
-- target_speed_kmh, target_incline_pct, target_level }] }]. Every exercise
-- needs at least one set. An exercise's sets are replaced as a whole on
-- each save: nothing points at them, because a workout copies the numbers
-- when it starts. Still one transaction, with the caller's rights.
create or replace function public.save_routine(
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
  v_item jsonb;
  v_position integer;
  v_exercise_id uuid;
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
