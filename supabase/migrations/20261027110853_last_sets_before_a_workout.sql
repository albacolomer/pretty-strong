-- US-14 on Avui's "Tot fet": how many exercises beat last time today. For a
-- finished workout, last time is the time before it, so last_sets() can
-- now look back from a given workout: p_before_session_id leaves out that
-- workout and every one after it. Without it (null, the default) it works
-- as before, for a workout starting now.
--
-- A new argument changes the function's signature, so it's dropped and
-- created again. Same columns, same rights: the caller's, so RLS keeps it
-- to your own workouts. Nothing is stored (data rule 2).
drop function public.last_sets(uuid, uuid[]);

create function public.last_sets(
  p_routine_id uuid,
  p_exercise_ids uuid[],
  p_before_session_id uuid default null
)
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
  with cutoff as (
    -- The workout to look back from: its day, and when it ended (or was
    -- saved, for one logged afterwards).
    select ws.date, coalesce(ws.ended_at, ws.created_at) as at
    from public.workout_sessions ws
    where ws.id = p_before_session_id
  ),
  done as (
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
      -- Looking back from a workout: only the ones before it.
      and (
        p_before_session_id is null
        or (
          ws.id <> p_before_session_id
          and (ws.date, coalesce(ws.ended_at, ws.created_at)) < (select c.date, c.at from cutoff c)
        )
      )
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

revoke execute on function public.last_sets(uuid, uuid[], uuid) from public, anon;
grant execute on function public.last_sets(uuid, uuid[], uuid) to authenticated;
