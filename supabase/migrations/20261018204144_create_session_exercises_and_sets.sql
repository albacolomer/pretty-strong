-- US-13, US-22: what a live workout logs. Starting a workout copies the
-- routine into session_exercises (data rule 1), so editing the routine
-- later never changes it; routine_exercise_id still links each one to its
-- plan. Only sets that were done are stored, each with completed_at
-- (data rule 7). Ids are made on the phone (data rule 5).

create table public.session_exercises (
  id uuid primary key,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  -- The routine exercise it came from; empty if added mid-workout, or if
  -- it has since been taken out of the routine.
  routine_exercise_id uuid references public.routine_exercises (id) on delete set null,
  position integer not null
    constraint session_exercises_position_check check (position >= 0),
  -- Same key = superset or circuit, as in the routine.
  group_key text,
  rest_s integer
    constraint session_exercises_rest_check check (rest_s between 0 and 600),
  -- What happened to the plan in this session only (US-15).
  change text
    constraint session_exercises_change_check check (change in ('added', 'swapped', 'skipped')),
  swapped_from_id uuid references public.exercises (id),
  change_reason text
    constraint session_exercises_change_reason_check
      check (change_reason in ('machine_busy', 'pain', 'tired', 'no_time', 'other')),
  notes text
    constraint session_exercises_notes_length check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

create index session_exercises_session_id_idx on public.session_exercises (session_id, position);
create index session_exercises_exercise_id_idx on public.session_exercises (exercise_id);

create table public.sets (
  id uuid primary key,
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  position integer not null
    constraint sets_position_check check (position >= 0),
  set_type text not null default 'normal'
    constraint sets_set_type_check check (set_type in ('normal', 'drop')),
  -- Only the columns the exercise's tracking type uses are filled; units
  -- in the names (data rule 6).
  weight_kg numeric(6, 2)
    constraint sets_weight_check check (weight_kg between 0 and 1000),
  reps integer
    constraint sets_reps_check check (reps between 0 and 1000),
  duration_s integer
    constraint sets_duration_check check (duration_s between 0 and 86400),
  distance_m integer
    constraint sets_distance_check check (distance_m between 0 and 1000000),
  speed_kmh numeric(4, 1)
    constraint sets_speed_check check (speed_kmh between 0 and 60),
  incline_pct numeric(4, 1)
    constraint sets_incline_check check (incline_pct between -10 and 40),
  level integer
    constraint sets_level_check check (level between 0 and 100),
  rpe numeric(3, 1)
    constraint sets_rpe_check check (rpe between 1 and 10),
  completed_at timestamptz not null,
  constraint sets_position_unique unique (session_exercise_id, position)
);

-- Row Level Security: through the session, which is yours (user_id), like
-- routine_exercises through its routine. A session can only hold exercises
-- you can see (built-ins and your own).
alter table public.session_exercises enable row level security;
alter table public.sets enable row level security;

create policy "Users can read their sessions' exercises"
  on public.session_exercises for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = (select auth.uid())
    )
  );

create policy "Users can log exercises in their sessions"
  on public.session_exercises for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = (select auth.uid())
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "Users can change their sessions' exercises"
  on public.session_exercises for update
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = (select auth.uid())
    )
    and exists (select 1 from public.exercises e where e.id = exercise_id)
  );

create policy "Users can remove exercises from their sessions"
  on public.session_exercises for delete
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.user_id = (select auth.uid())
    )
  );

create policy "Users can read their sets"
  on public.sets for select
  to authenticated
  using (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = session_exercise_id and ws.user_id = (select auth.uid())
    )
  );

create policy "Users can log their sets"
  on public.sets for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = session_exercise_id and ws.user_id = (select auth.uid())
    )
  );

create policy "Users can change their sets"
  on public.sets for update
  to authenticated
  using (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = session_exercise_id and ws.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = session_exercise_id and ws.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their sets"
  on public.sets for delete
  to authenticated
  using (
    exists (
      select 1
      from public.session_exercises se
      join public.workout_sessions ws on ws.id = se.session_id
      where se.id = session_exercise_id and ws.user_id = (select auth.uid())
    )
  );

-- Saves a finished live workout (data rule 5): the session, its exercises
-- and their sets, in one transaction, so it's never half-saved. Sending the
-- same session again replaces it rather than adding a copy, so a retry
-- after losing signal is safe. p_session:
-- { id, date, planned_routine_id, routine_id, change_reason, started_at,
--   ended_at, energy, notes, exercises: [{ id, exercise_id, routine_exercise_id, group_key,
--   rest_s, change, swapped_from_id, change_reason, notes, sets: [{ id,
--   set_type, weight_kg, reps, duration_s, distance_m, speed_kmh,
--   incline_pct, level, rpe, completed_at }] }] }, all in order.
-- Runs with the caller's rights, so all the RLS policies above apply.
create function public.finish_workout(p_session jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_session_id uuid := (p_session ->> 'id')::uuid;
begin
  insert into public.workout_sessions (
    id, user_id, date, planned_routine_id, routine_id, change_reason, status,
    log_mode, started_at, ended_at, energy, notes
  )
  values (
    v_session_id,
    auth.uid(),
    (p_session ->> 'date')::date,
    (p_session ->> 'planned_routine_id')::uuid,
    (p_session ->> 'routine_id')::uuid,
    p_session ->> 'change_reason',
    'completed',
    'live',
    (p_session ->> 'started_at')::timestamptz,
    (p_session ->> 'ended_at')::timestamptz,
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

revoke execute on function public.finish_workout(jsonb) from public, anon;
grant execute on function public.finish_workout(jsonb) to authenticated;
