import { isNetworkError, postgresErrorCode } from '@/lib/errors';

import type { Exercise } from './exercise';
import type { Equipment, Muscle, TrackingType } from './vocabulary';

// What the "new exercise" form holds while it is being filled in.
export type ExerciseDraft = {
  name: string;
  trackingType: TrackingType;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  equipment: Equipment;
  isUnilateral: boolean;
};

export const EXERCISE_NAME_MAX_LENGTH = 60;

// "Sense material" until you pick something else.
export function emptyDraft(name = ''): ExerciseDraft {
  return {
    name,
    trackingType: 'weight_reps',
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: 'none',
    isUnilateral: false,
  };
}

// Editing one of your exercises starts from what's saved.
export function draftFromExercise(exercise: Exercise): ExerciseDraft {
  return {
    name: exercise.name ?? '',
    trackingType: exercise.trackingType,
    primaryMuscles: [...exercise.primaryMuscles],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: exercise.equipment,
    isUnilateral: exercise.isUnilateral,
  };
}

// Strength exercises need a main muscle: it drives the muscle filter and,
// later, sets per muscle group. Cardio is counted by type instead, so
// muscles are optional there.
const MUSCLES_OPTIONAL: readonly TrackingType[] = ['cardio_machine', 'run'];

export function needsMuscles(trackingType: TrackingType): boolean {
  return !MUSCLES_OPTIONAL.includes(trackingType);
}

// Each error is also the last part of its translation key:
// exercises.form.errors.<error>.
export type DraftFieldError = 'required' | 'nameTooLong' | 'musclesRequired';
export type DraftErrors = Partial<Record<'name' | 'primaryMuscles', DraftFieldError>>;

export function validateDraft(draft: ExerciseDraft): DraftErrors {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (name === '') errors.name = 'required';
  else if (name.length > EXERCISE_NAME_MAX_LENGTH) errors.name = 'nameTooLong';
  if (needsMuscles(draft.trackingType) && draft.primaryMuscles.length === 0) {
    errors.primaryMuscles = 'musclesRequired';
  }
  return errors;
}

// Picking a muscle as main removes it from the secondary ones, so a muscle
// is never both.
export function togglePrimaryMuscle(draft: ExerciseDraft, muscle: Muscle): ExerciseDraft {
  const isPrimary = draft.primaryMuscles.includes(muscle);
  return {
    ...draft,
    primaryMuscles: isPrimary
      ? draft.primaryMuscles.filter((m) => m !== muscle)
      : [...draft.primaryMuscles, muscle],
    secondaryMuscles: draft.secondaryMuscles.filter((m) => m !== muscle),
  };
}

export function toggleSecondaryMuscle(draft: ExerciseDraft, muscle: Muscle): ExerciseDraft {
  return {
    ...draft,
    secondaryMuscles: draft.secondaryMuscles.includes(muscle)
      ? draft.secondaryMuscles.filter((m) => m !== muscle)
      : [...draft.secondaryMuscles, muscle],
  };
}

// Why saving failed. Each reason is also the last part of its translation
// key: exercises.form.errors.<reason>.
export type SaveErrorReason = 'nameTaken' | 'network' | 'unknown';

const UNIQUE_VIOLATION = '23505';

export function saveErrorReason(error: unknown): SaveErrorReason {
  if (isNetworkError(error)) return 'network';
  // The exercises_owner_name_unique index: you already have one with that name.
  if (postgresErrorCode(error) === UNIQUE_VIOLATION) return 'nameTaken';
  return 'unknown';
}
