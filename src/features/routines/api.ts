import { EXERCISE_COLUMNS, toExercise } from '@/features/exercises/exercise';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import type { Routine, RoutineLabel } from './routine';

// Your active routines, oldest first, each with its exercises in order and
// each exercise's details (archived ones included, so names never go
// missing). RLS only returns your own.
export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from('routines')
    .select(
      `id, name, label, notes, routine_exercises(id, exercise_id, position, planned_sets, rest_s, group_key, notes, exercise:exercises(${EXERCISE_COLUMNS}))`,
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
    notes: row.notes,
    exercises: row.routine_exercises.map((item) => ({
      id: item.id,
      exerciseId: item.exercise_id,
      exercise: toExercise(item.exercise),
      plannedSets: item.planned_sets,
      restS: item.rest_s,
      groupKey: item.group_key,
      notes: item.notes,
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
};

export type SaveRoutineInput = {
  // Null creates a new routine.
  id: string | null;
  name: string;
  label: RoutineLabel;
  notes: string | null;
  exercises: SaveRoutineExercise[];
};

type SaveRoutineArgs = Database['public']['Functions']['save_routine']['Args'];

// Saves the routine and its whole exercise list in one transaction (see the
// save_routine() function). Returns the routine's id.
export async function saveRoutine(input: SaveRoutineInput): Promise<string> {
  // Supabase's type generator marks every function argument as required
  // text, but Postgres accepts null here: a null id creates a routine and
  // null notes means none. Hence the one cast.
  const args = {
    p_id: input.id,
    p_name: input.name,
    p_label: input.label,
    p_notes: input.notes,
    p_exercises: input.exercises,
  } as SaveRoutineArgs;
  const { data, error } = await supabase.rpc('save_routine', args);
  if (error) throw error;
  return data;
}
