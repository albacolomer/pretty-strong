import { EXERCISE_COLUMNS, toExercise } from '@/features/exercises/exercise';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { WEEKDAYS, type Routine, type RoutineLabel, type Weekday } from './routine';

const ROUTINE_EXERCISE_COLUMNS =
  'id, exercise_id, position, planned_sets, rest_s, group_key, notes, target_weight_kg, target_reps, target_duration_s, target_distance_m, target_speed_kmh, target_incline_pct, target_level';

// Your active routines, oldest first, each with its exercises in order (and
// each exercise's details, archived ones included, so names never go
// missing) and its weekdays. RLS only returns your own.
export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(
      `id, name, label, custom_label, planned_duration_s, notes, weekly_schedule(weekday), routine_exercises(${ROUTINE_EXERCISE_COLUMNS}, exercise:exercises(${EXERCISE_COLUMNS}))`,
    )
    .is('archived_at', null)
    .order('created_at')
    .order('position', { referencedTable: 'routine_exercises' });
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    // The database's check constraint guarantees the code.
    label: row.label as RoutineLabel,
    customLabel: row.custom_label,
    plannedDurationS: row.planned_duration_s,
    notes: row.notes,
    // Monday first; the check constraint guarantees 1–7.
    weekdays: WEEKDAYS.filter((day) => row.weekly_schedule.some((item) => item.weekday === day)),
    exercises: row.routine_exercises.map((item) => ({
      id: item.id,
      exerciseId: item.exercise_id,
      exercise: toExercise(item.exercise),
      plannedSets: item.planned_sets,
      restS: item.rest_s,
      groupKey: item.group_key,
      notes: item.notes,
      targets: {
        weightKg: item.target_weight_kg,
        reps: item.target_reps,
        durationS: item.target_duration_s,
        distanceM: item.target_distance_m,
        speedKmh: item.target_speed_kmh,
        inclinePct: item.target_incline_pct,
        level: item.target_level,
      },
    })),
  }));
}

// What save_routine() takes for each exercise, in order. Leave `id` out
// for exercises that are new to the routine.
export type SaveRoutineExercise = {
  id?: string;
  exercise_id: string;
  planned_sets: number;
  rest_s: number | null;
  group_key: string | null;
  notes: string | null;
  target_weight_kg: number | null;
  target_reps: number | null;
  target_duration_s: number | null;
  target_distance_m: number | null;
  target_speed_kmh: number | null;
  target_incline_pct: number | null;
  target_level: number | null;
};

export type SaveRoutineInput = {
  // Null creates a new routine.
  id: string | null;
  name: string;
  label: RoutineLabel;
  customLabel: string | null;
  plannedDurationS: number | null;
  notes: string | null;
  weekdays: Weekday[];
  exercises: SaveRoutineExercise[];
};

type SaveRoutineArgs = Database['public']['Functions']['save_routine']['Args'];

// Saves the routine, its whole exercise list and its weekdays in one
// transaction (see the save_routine() function). Returns the routine's id.
export async function saveRoutine(input: SaveRoutineInput): Promise<string> {
  // Supabase's type generator marks every function argument as required,
  // but Postgres accepts null here: a null id creates a routine, and null
  // notes, custom name or duration mean none. Hence the one cast.
  const args = {
    p_id: input.id,
    p_name: input.name,
    p_label: input.label,
    p_custom_label: input.customLabel,
    p_planned_duration_s: input.plannedDurationS,
    p_notes: input.notes,
    p_weekdays: input.weekdays,
    p_exercises: input.exercises,
  } as SaveRoutineArgs;
  const { data, error } = await supabase.rpc('save_routine', args);
  if (error) throw error;
  return data;
}
