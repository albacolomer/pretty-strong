import { EXERCISE_COLUMNS, toExercise } from '@/features/exercises/exercise';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

import { WEEKDAYS, type Routine, type RoutineLabel, type Weekday } from './routine';

const ROUTINE_SET_COLUMNS =
  'position, target_weight_kg, target_reps, target_duration_s, target_distance_m, target_speed_kmh, target_incline_pct, target_level';

function selectRoutines() {
  return supabase
    .from('routines')
    .select(
      `id, name, label, custom_label, planned_duration_s, notes, description, weekly_schedule(weekday, position), routine_exercises(id, exercise_id, position, rest_s, group_key, notes, routine_sets(${ROUTINE_SET_COLUMNS}), exercise:exercises(${EXERCISE_COLUMNS}, deleted_at))`,
    )
    .order('position', { referencedTable: 'routine_exercises' });
}

type RoutineRow = NonNullable<Awaited<ReturnType<typeof selectRoutines>>['data']>[number];

// Your active routines, oldest first, each with its exercises in order (and
// each exercise's details, archived ones included, so names never go
// missing; deleted ones are left out) and its weekdays. RLS only returns
// your own.
export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await selectRoutines().is('archived_at', null).order('created_at');
  if (error) throw error;
  return data.map(toRoutine);
}

// Your archived routines, most recently archived first (US-06); deleted
// ones are left out.
export async function fetchArchivedRoutines(): Promise<Routine[]> {
  const { data, error } = await selectRoutines()
    .not('archived_at', 'is', null)
    .is('deleted_at', null)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return data.map(toRoutine);
}

// Archiving only sets archived_at; nothing is deleted, so past workouts keep
// their routine (data rule 3). Its weekdays are kept too, for a restore;
// Today and the week leave archived routines out.
export async function setRoutineArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('routines')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

// Deleting hides a routine from every list, the archived one too, but keeps
// its row, so past workouts and the calendar still show it (data rule 3).
// It's archived as well, which Today and the week already leave out. Undo
// (`deleted` false) puts it back as it was: archived or not.
export async function setRoutineDeleted(
  id: string,
  deleted: boolean,
  wasArchived: boolean,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('routines')
    .update({
      deleted_at: deleted ? now : null,
      ...(wasArchived ? {} : { archived_at: deleted ? now : null }),
    })
    .eq('id', id);
  if (error) throw error;
}

function toRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    // The database's check constraint guarantees the code.
    label: row.label as RoutineLabel,
    customLabel: row.custom_label,
    plannedDurationS: row.planned_duration_s,
    notes: row.notes,
    description: row.description,
    // Monday first; the check constraint guarantees 1–7.
    weekdays: WEEKDAYS.filter((day) => row.weekly_schedule.some((item) => item.weekday === day)),
    dayPositions: Object.fromEntries(
      row.weekly_schedule.map((item) => [item.weekday, item.position]),
    ),
    // A deleted exercise leaves the routines it was in.
    exercises: row.routine_exercises
      .filter((item) => item.exercise.deleted_at === null)
      .map((item) => ({
        id: item.id,
        exerciseId: item.exercise_id,
        exercise: toExercise(item.exercise),
        restS: item.rest_s,
        groupKey: item.group_key,
        notes: item.notes,
        sets: [...item.routine_sets]
          .sort((a, b) => a.position - b.position)
          .map((set) => ({
            weightKg: set.target_weight_kg,
            reps: set.target_reps,
            durationS: set.target_duration_s,
            distanceM: set.target_distance_m,
            speedKmh: set.target_speed_kmh,
            inclinePct: set.target_incline_pct,
            level: set.target_level,
          })),
      })),
  };
}

// What save_routine() takes for each exercise, in order. Leave `id` out
// for exercises that are new to the routine.
export type SaveRoutineExercise = {
  id?: string;
  exercise_id: string;
  rest_s: number | null;
  group_key: string | null;
  notes: string | null;
  // At least one, in order.
  sets: SaveRoutineSet[];
};

// One planned set: its first-time plan.
export type SaveRoutineSet = {
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
  description: string | null;
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
    p_description: input.description,
  } as SaveRoutineArgs;
  const { data, error } = await supabase.rpc('save_routine', args);
  if (error) throw error;
  return data;
}
