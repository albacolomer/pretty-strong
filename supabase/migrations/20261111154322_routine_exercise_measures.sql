-- What a cardio machine or a carry measures in a routine: chips over its
-- sets ("Temps", "Inclinació", "+"), so only those columns show, in the
-- editor and in the workout. Null: not chosen yet; the app then shows the
-- exercise's defaults and whatever its plan has numbers for, as before.
-- Only what it shows: the sets still store raw numbers in their own
-- columns (data rule 6), and past workouts are untouched (data rule 1).

-- 1. The measures, from a fixed list.
alter table public.routine_exercises
  add column measures text[]
    constraint routine_exercises_measures_check check (
      cardinality(measures) between 1 and 6
      and measures <@ array['weight', 'distance', 'duration', 'speed', 'incline', 'level']
    );

-- 2. save_routine() keeps each exercise's measures (null when not sent).
-- Same arguments, replaced in place, so its grants stay.
create or replace function public.save_routine(
  p_id uuid,
  p_name text,
  p_label text,
  p_custom_label text,
  p_planned_duration_s integer,
  p_notes text,
  p_weekdays smallint[],
  p_exercises jsonb,
  p_description text default null
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
    (id, user_id, name, label, custom_label, planned_duration_s, notes, description)
  values (
    v_routine_id,
    auth.uid(),
    trim(p_name),
    p_label,
    case when p_label = 'custom' then nullif(trim(p_custom_label), '') end,
    p_planned_duration_s,
    nullif(trim(p_notes), ''),
    nullif(trim(p_description), '')
  )
  on conflict (id) do update
    set name = excluded.name,
        label = excluded.label,
        custom_label = excluded.custom_label,
        planned_duration_s = excluded.planned_duration_s,
        notes = excluded.notes,
        description = excluded.description;

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
      (id, routine_id, exercise_id, position, group_key, rest_s, notes, measures)
    values (
      coalesce((v_item ->> 'id')::uuid, gen_random_uuid()),
      v_routine_id,
      (v_item ->> 'exercise_id')::uuid,
      v_position,
      v_item ->> 'group_key',
      (v_item ->> 'rest_s')::integer,
      v_item ->> 'notes',
      case
        when jsonb_typeof(v_item -> 'measures') = 'array'
          then array(select jsonb_array_elements_text(v_item -> 'measures'))
      end
    )
    on conflict (id) do update
      set exercise_id = excluded.exercise_id,
          position = excluded.position,
          group_key = excluded.group_key,
          rest_s = excluded.rest_s,
          notes = excluded.notes,
          measures = excluded.measures
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
      greatest(
        (
          select max(ws.position) + 1
          from public.weekly_schedule ws
          where ws.user_id = auth.uid() and ws.weekday = day.weekday
        ),
        (
          select max(sp.position) + 1
          from public.weekly_sports sp
          where sp.user_id = auth.uid() and sp.weekday = day.weekday
        )
      ),
      0
    )
  from (select distinct unnest(v_weekdays) as weekday) as day
  on conflict (routine_id, weekday) do nothing;

  return v_routine_id;
end;
$$;
