import type { Exercise } from '@/features/exercises/exercise';

// Fixed codes, matching routines_label_check in the create_routines
// migration. Each is also the last part of its translation key:
// routines.labels.<label>.
export const ROUTINE_LABELS = ['strength', 'hyrox', 'run', 'other'] as const;
export type RoutineLabel = (typeof ROUTINE_LABELS)[number];

// One exercise in a routine, with its plan for it.
export type RoutineExercise = {
  id: string;
  exerciseId: string;
  // The exercise itself, even if it has been archived since.
  exercise: Exercise;
  plannedSets: number;
  // Empty: the exercise's own default rest, or the app's.
  restS: number | null;
  // Same key = superset or circuit (US-08).
  groupKey: string | null;
  notes: string | null;
};

export type Routine = {
  id: string;
  name: string;
  label: RoutineLabel;
  notes: string | null;
  // In order.
  exercises: RoutineExercise[];
};

export const ROUTINE_NAME_MAX_LENGTH = 60;
export const PLANNED_SETS_MIN = 1;
export const PLANNED_SETS_MAX = 20;
export const DEFAULT_PLANNED_SETS = 3;
