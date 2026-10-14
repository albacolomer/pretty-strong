import { supabase } from '@/lib/supabase';

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
