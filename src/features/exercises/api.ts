import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database';

import { EXERCISE_COLUMNS, toExercise, type Exercise } from './exercise';
import type { Equipment, Muscle, TrackingType } from './vocabulary';

// The whole library the user can see: RLS returns the built-ins plus their
// own custom exercises. Archived ones are left out.
export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_COLUMNS)
    .is('archived_at', null);
  if (error) throw error;
  return data.map(toExercise);
}

// Your own archived exercises, most recently archived first. Built-ins are
// never archived by users, so they're left out.
export async function fetchArchivedExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select(EXERCISE_COLUMNS)
    .not('archived_at', 'is', null)
    .not('owner_id', 'is', null)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return data.map(toExercise);
}

// Archiving only sets archived_at; nothing is ever deleted, so past
// workouts keep pointing at the exercise (data rule 3). RLS only allows it
// on your own exercises.
export async function setExerciseArchived(id: string, archived: boolean): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .select(EXERCISE_COLUMNS)
    .single();
  if (error) throw error;
  return toExercise(data);
}

export type NewExercise = {
  ownerId: string;
  name: string;
  trackingType: TrackingType;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  isUnilateral: boolean;
};

// Saves a custom exercise and returns it as stored. RLS only lets users
// create exercises they own.
export async function createExercise(input: NewExercise): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      owner_id: input.ownerId,
      name: input.name.trim(),
      tracking_type: input.trackingType,
      primary_muscles: input.primaryMuscles,
      secondary_muscles: input.secondaryMuscles,
      equipment: input.equipment,
      is_unilateral: input.isUnilateral,
    })
    .select(EXERCISE_COLUMNS)
    .single();
  if (error) throw error;
  return toExercise(data);
}

// Your personal layer on an exercise (US-05): notes and default rest.
export type ExerciseSettings = { notes: string | null; defaultRestS: number | null };
export type ExerciseSettingsChange = Partial<ExerciseSettings>;

// All your settings at once (one small row per exercise you've annotated),
// by exercise id. A workout can then read every default rest without
// extra requests.
export async function fetchExerciseSettings(): Promise<Record<string, ExerciseSettings>> {
  const { data, error } = await supabase
    .from('user_exercise_settings')
    .select('exercise_id, notes, default_rest_s');
  if (error) throw error;
  return Object.fromEntries(
    data.map((row) => [row.exercise_id, { notes: row.notes, defaultRestS: row.default_rest_s }]),
  );
}

// Creates or updates your row for this exercise. Only the fields in
// `change` are written, so saving the notes leaves the rest untouched.
export async function saveExerciseSettings(
  userId: string,
  exerciseId: string,
  change: ExerciseSettingsChange,
): Promise<void> {
  const row: TablesInsert<'user_exercise_settings'> = { user_id: userId, exercise_id: exerciseId };
  if ('notes' in change) row.notes = change.notes;
  if ('defaultRestS' in change) row.default_rest_s = change.defaultRestS;
  const { error } = await supabase
    .from('user_exercise_settings')
    .upsert(row, { onConflict: 'user_id,exercise_id' });
  if (error) throw error;
}
