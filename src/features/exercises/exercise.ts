import type { Language } from '@/lib/i18n';
import type { Tables } from '@/types/database';

import type { Equipment, Muscle, TrackingType } from './vocabulary';

export type ExerciseNames = Record<Language, string>;

// An exercise as the app uses it. Built-ins have `names` in every language;
// custom exercises (US-04) have a single `name`.
export type Exercise = {
  id: string;
  slug: string | null;
  names: ExerciseNames | null;
  name: string | null;
  trackingType: TrackingType;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  isUnilateral: boolean;
};

export const EXERCISE_COLUMNS =
  'id, slug, name, name_i18n, tracking_type, primary_muscles, secondary_muscles, equipment, is_unilateral';

export type ExerciseRow = Pick<
  Tables<'exercises'>,
  | 'id'
  | 'slug'
  | 'name'
  | 'name_i18n'
  | 'tracking_type'
  | 'primary_muscles'
  | 'secondary_muscles'
  | 'equipment'
  | 'is_unilateral'
>;

// The database's check constraints already guarantee every code, so the
// casts below only tell TypeScript what the database promises.
export function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    names: row.name_i18n as ExerciseNames | null,
    name: row.name,
    trackingType: row.tracking_type as TrackingType,
    primaryMuscles: row.primary_muscles as Muscle[],
    secondaryMuscles: row.secondary_muscles as Muscle[],
    equipment: row.equipment as Equipment,
    isUnilateral: row.is_unilateral,
  };
}

export function exerciseName(exercise: Exercise, language: Language): string {
  return exercise.names?.[language] ?? exercise.name ?? '';
}
