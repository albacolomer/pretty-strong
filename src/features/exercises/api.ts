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
