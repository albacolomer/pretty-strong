-- The Profile screen: who you are, your weekly goal, and your workouts
-- with their totals (History moves into Profile).

-- Shown under the avatar: "Alba Colomer", "Barcelona · HYROX & strength".
-- All optional; without a name the username shows.
alter table public.profiles
  add column display_name text
    constraint profiles_display_name_length check (char_length(display_name) <= 50),
  add column city text
    constraint profiles_city_length check (char_length(city) <= 50),
  add column focus text
    constraint profiles_focus_length check (char_length(focus) <= 60),
  -- Workouts a week you aim for. Null: as many as days planned in the week.
  add column weekly_goal smallint
    constraint profiles_weekly_goal_check check (weekly_goal between 1 and 14);

-- Changed from Edita el perfil; the RLS update policy (your own row) still
-- applies.
grant update (display_name, city, focus, weekly_goal) on public.profiles to authenticated;

-- Your finished workouts with their totals, newest first: for the calendar,
-- the list, the numbers in Profile and Progress. Worked out from the sets
-- every time, never stored (data rule 2). Dates from p_from to p_to, both
-- included; null for no limit. Runs with the caller's rights, so RLS keeps
-- it to your own workouts.
--   duration_s: a quick log's own, else ended_at - started_at.
--   volume_kg: weight × reps over the sets that have both.
--   distance_m: run and cardio machine sets.
--   pace_distance_m, pace_duration_s: run sets that have both, for the pace.
create function public.workout_summaries(p_from date default null, p_to date default null)
returns table (
  id uuid,
  date date,
  routine_id uuid,
  routine_name text,
  routine_label text,
  routine_custom_label text,
  log_mode text,
  duration_s integer,
  exercises integer,
  sets integer,
  volume_kg numeric,
  distance_m integer,
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
    ws.log_mode,
    coalesce(
      ws.duration_s,
      extract(epoch from ws.ended_at - ws.started_at)::integer
    ),
    coalesce(totals.exercises, 0)::integer,
    coalesce(totals.sets, 0)::integer,
    coalesce(totals.volume_kg, 0),
    coalesce(totals.distance_m, 0)::integer,
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
