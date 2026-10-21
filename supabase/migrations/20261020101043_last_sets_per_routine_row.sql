-- US-13, US-14, US-19: last time per routine row. A run routine is made of
-- several blocks of the same run exercise (a 1 km warm-up, then 6 × 400 m),
-- and a routine can hold the same exercise twice. Matching last time by
-- exercise alone mixed them up, so inside a routine each row now gets the
-- sets it had itself.
--
-- Replaces last_sets() from 20261019074836_last_time.sql. Scope 'routine'
-- now returns every time the exercise was done in the last finished workout
-- of this routine that included it, each with its routine_exercise_id;
-- scope 'any' is as before, one per exercise. The result gains a column,
-- so the function is dropped and created again. Same arguments, same
-- rights: the caller's, so RLS keeps it to your own workouts. Nothing is
-- stored (data rule 2).
drop function public.last_sets(uuid, uuid[]);

create function public.last_sets(p_routine_id uuid, p_exercise_ids uuid[])
returns table (
  exercise_id uuid,
  scope text,
  routine_exercise_id uuid,
  session_date date,
  "position" integer,
  set_type text,
  weight_kg numeric,
  reps integer,
  duration_s integer,
  distance_m integer,
  speed_kmh numeric,
  incline_pct numeric,
  level integer
)
language sql
stable
set search_path = ''
as $$
  with done as (
    -- Exercises with logged sets, in finished workouts.
    select
      se.id,
      se.exercise_id,
      se.routine_exercise_id,
      se.position as exercise_position,
      ws.id as session_id,
      ws.routine_id,
      ws.date,
      ws.ended_at,
      ws.created_at
    from public.session_exercises se
    join public.workout_sessions ws on ws.id = se.session_id
    where ws.status = 'completed'
      and se.exercise_id = any (p_exercise_ids)
      and exists (select 1 from public.sets s where s.session_exercise_id = se.id)
  ),
  routine_session as (
    -- Per exercise, the last workout of this routine that included it.
    select distinct on (d.exercise_id) d.exercise_id, d.session_id
    from done d
    where d.routine_id = p_routine_id
    order by d.exercise_id, d.date desc, d.ended_at desc nulls last, d.created_at desc
  ),
  latest as (
    -- Every time it was done in that workout.
    select d.exercise_id, 'routine' as scope, d.id, d.routine_exercise_id, d.date,
      d.exercise_position
    from done d
    join routine_session rs
      on rs.exercise_id = d.exercise_id and rs.session_id = d.session_id
    union all
    -- And its last time anywhere, once.
    select * from (
      select distinct on (d.exercise_id)
        d.exercise_id, 'any' as scope, d.id, d.routine_exercise_id, d.date,
        d.exercise_position
      from done d
      order by d.exercise_id, d.date desc, d.ended_at desc nulls last, d.created_at desc,
        d.exercise_position desc
    ) as anywhere
  )
  select
    l.exercise_id, l.scope, l.routine_exercise_id, l.date, s.position, s.set_type,
    s.weight_kg, s.reps, s.duration_s, s.distance_m, s.speed_kmh, s.incline_pct, s.level
  from latest l
  join public.sets s on s.session_exercise_id = l.id
  order by l.exercise_id, l.scope, l.exercise_position, s.position;
$$;

revoke execute on function public.last_sets(uuid, uuid[]) from public, anon;
grant execute on function public.last_sets(uuid, uuid[]) to authenticated;
