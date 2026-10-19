-- US-13, US-14 (spec: "Last time" lookup): the sets each exercise had the
-- last time it was done, to pre-fill a new workout and to compare with it.
-- Called once when a workout starts, for all its exercises.
--
-- For each exercise it returns two lists of sets: scope 'routine', from
-- the last finished workout of this routine that included it, and scope
-- 'any', from the last finished workout anywhere. The app picks: this
-- routine's, else the routine's first-time plan, else anywhere's. Only
-- exercises with logged sets count. Runs with the caller's rights, so RLS
-- keeps it to your own workouts. Nothing is stored (data rule 2).
create function public.last_sets(p_routine_id uuid, p_exercise_ids uuid[])
returns table (
  exercise_id uuid,
  scope text,
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
  with latest as (
    select distinct on (se.exercise_id, scopes.scope)
      se.exercise_id,
      scopes.scope,
      se.id as session_exercise_id,
      ws.date
    from public.session_exercises se
    join public.workout_sessions ws on ws.id = se.session_id
    cross join lateral (
      select 'routine' as scope where ws.routine_id = p_routine_id
      union all
      select 'any'
    ) as scopes
    where ws.status = 'completed'
      and se.exercise_id = any (p_exercise_ids)
      and exists (select 1 from public.sets s where s.session_exercise_id = se.id)
    order by se.exercise_id, scopes.scope, ws.date desc, ws.ended_at desc nulls last,
      ws.created_at desc
  )
  select
    l.exercise_id, l.scope, l.date, s.position, s.set_type, s.weight_kg, s.reps,
    s.duration_s, s.distance_m, s.speed_kmh, s.incline_pct, s.level
  from latest l
  join public.sets s on s.session_exercise_id = l.session_exercise_id
  order by l.exercise_id, l.scope, s.position;
$$;

revoke execute on function public.last_sets(uuid, uuid[]) from public, anon;
grant execute on function public.last_sets(uuid, uuid[]) to authenticated;
