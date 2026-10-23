-- Profile → Progress (US-26): kilometres run, whatever the routine (the
-- runs inside a HYROX session count too), apart from cardio machines.
-- Replaces workout_summaries() from
-- 20261023155746_profile_details_and_workout_summaries.sql, adding
-- run_distance_m. Its result gains a column, so it's dropped and created
-- again; the rest is unchanged.
--   run_distance_m: run sets only.
drop function public.workout_summaries(date, date);

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
