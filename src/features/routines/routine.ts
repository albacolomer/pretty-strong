import type { Exercise } from '@/features/exercises/exercise';

import type { Measure } from './targets';

// Routine types (spec: "Routine types"), matching routines_label_check in
// the routine_types_plan_and_week migration. Each is also the last part of
// its translation key: routines.labels.<label>.
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

// The first-time plan for one set: what the first workout of this routine
// starts from. Only the fields the exercise's tracking type uses are set.
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
  // Empty: the exercise's own default rest, or the app's.
  restS: number | null;
  // Same key = superset or circuit (US-08).
  groupKey: string | null;
  notes: string | null;
  // One plan per set, in order (routine_sets); at least one.
  sets: ExerciseTargets[];
  // What a cardio machine or a carry measures here (see measuresOf). Null:
  // not chosen yet, so its defaults and whatever its plan uses.
  measures: Measure[] | null;
};

export type Routine = {
  id: string;
  name: string;
  label: RoutineLabel;
  // The name of a custom type, e.g. "Natació".
  customLabel: string | null;
  plannedDurationS: number | null;
  notes: string | null;
  // A few words shown under it in the week: "Esquena i bíceps".
  description: string | null;
  // The days it's planned on, Monday first.
  weekdays: Weekday[];
  // Its place on each of those days, which can hold several routines.
  dayPositions: Partial<Record<Weekday, number>>;
  // In order.
  exercises: RoutineExercise[];
};

export const ROUTINE_NAME_MAX_LENGTH = 60;
// Matches routines_custom_label_check.
export const CUSTOM_LABEL_MAX_LENGTH = 30;
// Sets per exercise: at least one, at most 20.
export const PLANNED_SETS_MIN = 1;
export const PLANNED_SETS_MAX = 20;
// Matches routines_description_length.
export const ROUTINE_DESCRIPTION_MAX_LENGTH = 80;

// Matches routine_exercises_notes_length in the create_routines migration.
export const EXERCISE_NOTES_MAX_LENGTH = 500;

// Roughly how long a set takes when its plan doesn't say.
const SET_WORK_S = 45;
// A run's pace when only its distance is planned: 6 min/km.
const RUN_S_PER_KM = 360;

// How long a routine takes: its planned duration, or an estimate from its
// sets and rests (rest after each set; in a superset or circuit, after each
// round), to the nearest 5 minutes. Null with nothing to go on.
export function routineDuration(
  routine: Pick<Routine, 'plannedDurationS' | 'label' | 'exercises'>,
  defaultRestS: number,
): { seconds: number; estimated: boolean } | null {
  if (routine.plannedDurationS !== null) {
    return { seconds: routine.plannedDurationS, estimated: false };
  }
  if (routine.exercises.length === 0) return null;
  const run = routine.label === 'run';
  const groupSizes = new Map<string, number>();
  for (const { groupKey } of routine.exercises) {
    if (groupKey) groupSizes.set(groupKey, (groupSizes.get(groupKey) ?? 0) + 1);
  }
  const total = routine.exercises.reduce((sum, exercise) => {
    const work = exercise.sets.reduce(
      (time, set) =>
        time +
        (set.durationS ??
          (run && set.distanceM !== null ? (set.distanceM / 1000) * RUN_S_PER_KM : SET_WORK_S)),
      0,
    );
    // A run block rests only for its recovery.
    const restS = exercise.restS ?? (run ? 0 : defaultRestS);
    const sharedBy = exercise.groupKey ? (groupSizes.get(exercise.groupKey) ?? 1) : 1;
    return sum + work + (restS / sharedBy) * exercise.sets.length;
  }, 0);
  return { seconds: Math.max(300, Math.round(total / 300) * 300), estimated: true };
}
