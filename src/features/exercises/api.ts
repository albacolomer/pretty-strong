import { supabase } from '@/lib/supabase';

import { EXERCISE_COLUMNS, toExercise, type Exercise } from './exercise';

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
