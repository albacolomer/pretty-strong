import type { Exercise } from '@/features/exercises/exercise';

// Routine types (spec: "Routine types"), matching routines_label_check in
// the routine_types_plan_and_week migration. Each is also the last part of
// its translation keys: routines.labels.<label>, routines.labelHints.<label>.
export const ROUTINE_LABELS = ['strength', 'run', 'hybrid', 'class', 'custom'] as const;
export type RoutineLabel = (typeof ROUTINE_LABELS)[number];

// What each type's editor offers (spec: "Routine types"). A class is just
// a duration and notes; the others hold exercises.
export function usesExercises(label: RoutineLabel): boolean {
  return label !== 'class';
}

// Sessions whose length is known in advance: a 50-minute class, a 1-hour
// HYROX session.
export function usesPlannedDuration(label: RoutineLabel): boolean {
  return label === 'hybrid' || label === 'class' || label === 'custom';
}

// Planned duration: starts at 1 hour, changes 5 minutes at a time, and fits
// routines_planned_duration_check (1 minute to 10 hours).
export const DEFAULT_PLANNED_DURATION_S = 60 * 60;
export const PLANNED_DURATION_STEP_S = 5 * 60;
export const PLANNED_DURATION_MIN_S = 5 * 60;
export const PLANNED_DURATION_MAX_S = 10 * 60 * 60;

// "45 min", "1 h", "1 h 15 min".
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

// Weekdays as the database stores them: 1 = Monday … 7 = Sunday.
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// The first-time plan for an exercise: what its first workout in this
// routine starts from. Only the fields its tracking type uses are set.
export type ExerciseTargets = {
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  distanceM: number | null;
  speedKmh: number | null;
  inclinePct: number | null;
  level: number | null;
};

export const NO_TARGETS: ExerciseTargets = {
  weightKg: null,
  reps: null,
  durationS: null,
  distanceM: null,
  speedKmh: null,
  inclinePct: null,
  level: null,
};

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
  targets: ExerciseTargets;
};

export type Routine = {
  id: string;
  name: string;
  label: RoutineLabel;
  // The name of a custom type, e.g. "Natació".
  customLabel: string | null;
  plannedDurationS: number | null;
  notes: string | null;
  // The days it's planned on, Monday first.
  weekdays: Weekday[];
  // In order.
  exercises: RoutineExercise[];
};

export const ROUTINE_NAME_MAX_LENGTH = 60;
// Matches routines_custom_label_check.
export const CUSTOM_LABEL_MAX_LENGTH = 30;
export const PLANNED_SETS_MIN = 1;
export const PLANNED_SETS_MAX = 20;
export const DEFAULT_PLANNED_SETS = 3;
// Matches routine_exercises_notes_length in the create_routines migration.
export const EXERCISE_NOTES_MAX_LENGTH = 500;
