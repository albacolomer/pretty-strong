-- US-07: routines, the plan. Starting a workout will copy a routine into
-- its own rows (data rule 1), so editing a routine never changes past
-- workouts. Routines are archived, never deleted (data rule 3).

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null
    constraint routines_name_check check (char_length(trim(name)) between 1 and 60),
  label text not null default 'strength'
    constraint routines_label_check check (label in ('strength', 'hyrox', 'run', 'other')),
  notes text
    constraint routines_notes_length check (char_length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index routines_user_id_idx on public.routines (user_id);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position integer not null
    constraint routine_exercises_position_check check (position >= 0),
  -- Same key = superset or circuit (US-08); empty = on its own.
  group_key text,
  planned_sets integer not null default 3
    constraint routine_exercises_sets_check check (planned_sets between 1 and 20),
  -- Empty = the exercise's own default rest (user_exercise_settings), or
  -- the app's default.
  rest_s integer
    constraint routine_exercises_rest_check check (rest_s between 0 and 600),
  notes text
    constraint routine_exercises_notes_length check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index routine_exercises_routine_id_idx on public.routine_exercises (routine_id, position);
create index routine_exercises_exercise_id_idx on public.routine_exercises (exercise_id);

-- Row Level Security: users see and change only their own routines, and
-- their exercises through the parent routine. A routine can only hold
-- exercises the user can see (built-ins and their own); the exists() runs
-- under the exercises RLS. No delete policy on routines: they're archived.
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;

create policy "Users can read their own routines"
  on public.routines for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own routines"
  on public.routines for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own routines"
  on public.routines for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can read their routines' exercises"
  on public.routine_exercises for select
  to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can add exercises they can see to their routines"
  on public.routine_exercises for insert
  to authenticated
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "Users can change their routines' exercises"
  on public.routine_exercises for update
  to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

-- Taking an exercise out of a routine deletes that plan row. Past workouts
-- keep their own copy, so nothing they recorded is lost.
create policy "Users can remove exercises from their routines"
  on public.routine_exercises for delete
  to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = (select auth.uid())
    )
  );

-- Saves a routine and its whole exercise list in one transaction, so it's
-- never half-saved. p_id null creates a new routine. p_exercises is the
-- list in order: [{ id?, exercise_id, planned_sets, rest_s, group_key,
-- notes }]. Items with an id keep it (past workouts will link to it);
-- items without one are new; rows left out were removed from the routine.
-- Runs with the caller's rights, so all the RLS policies above apply.
create function public.save_routine(
  p_id uuid,
  p_name text,
  p_label text,
  p_notes text,
  p_exercises jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_routine_id uuid := coalesce(p_id, gen_random_uuid());
begin
  insert into public.routines (id, user_id, name, label, notes)
  values (v_routine_id, auth.uid(), trim(p_name), p_label, nullif(trim(p_notes), ''))
  on conflict (id) do update
    set name = excluded.name,
        label = excluded.label,
        notes = excluded.notes;

  delete from public.routine_exercises re
  where re.routine_id = v_routine_id
    and re.id not in (
      select (item ->> 'id')::uuid
      from jsonb_array_elements(p_exercises) as item
      where item ->> 'id' is not null
    );

  insert into public.routine_exercises
    (id, routine_id, exercise_id, position, group_key, planned_sets, rest_s, notes)
  select
    coalesce((list.item ->> 'id')::uuid, gen_random_uuid()),
    v_routine_id,
    (list.item ->> 'exercise_id')::uuid,
    (list.ordinality - 1)::integer,
    list.item ->> 'group_key',
    coalesce((list.item ->> 'planned_sets')::integer, 3),
    (list.item ->> 'rest_s')::integer,
    list.item ->> 'notes'
  from jsonb_array_elements(p_exercises) with ordinality as list(item, ordinality)
  on conflict (id) do update
    set exercise_id = excluded.exercise_id,
        position = excluded.position,
        group_key = excluded.group_key,
        planned_sets = excluded.planned_sets,
        rest_s = excluded.rest_s,
        notes = excluded.notes
    -- Never move a row that belongs to another routine.
    where public.routine_exercises.routine_id = excluded.routine_id;

  return v_routine_id;
end;
$$;

revoke execute on function public.save_routine(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.save_routine(uuid, text, text, text, jsonb) to authenticated;
