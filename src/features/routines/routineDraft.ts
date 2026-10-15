import type { SaveRoutineInput } from './api';
import {
  DEFAULT_PLANNED_SETS,
  PLANNED_SETS_MAX,
  PLANNED_SETS_MIN,
  ROUTINE_NAME_MAX_LENGTH,
  type Routine,
  type RoutineLabel,
} from './routine';

// One exercise while the routine is being edited. `key` identifies it in
// the list; `id` is its database id, or null until it's first saved.
export type DraftExercise = {
  key: string;
  id: string | null;
  exerciseId: string;
  plannedSets: number;
  restS: number | null;
  groupKey: string | null;
  notes: string | null;
};

export type RoutineDraft = {
  name: string;
  label: RoutineLabel;
  notes: string;
  exercises: DraftExercise[];
};

let lastKey = 0;
function newKey(): string {
  lastKey += 1;
  return `new-${lastKey}`;
}

export function emptyRoutineDraft(): RoutineDraft {
  return { name: '', label: 'strength', notes: '', exercises: [] };
}

export function draftFromRoutine(routine: Routine): RoutineDraft {
  return {
    name: routine.name,
    label: routine.label,
    notes: routine.notes ?? '',
    exercises: routine.exercises.map((exercise) => ({
      key: exercise.id,
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      plannedSets: exercise.plannedSets,
      restS: exercise.restS,
      groupKey: exercise.groupKey,
      notes: exercise.notes,
    })),
  };
}

// Each error is also the last part of its translation key:
// routines.editor.errors.<error>.
export type RoutineDraftError = 'required' | 'nameTooLong';
export type RoutineDraftErrors = Partial<Record<'name', RoutineDraftError>>;

export function validateRoutineDraft(draft: RoutineDraft): RoutineDraftErrors {
  const name = draft.name.trim();
  if (name === '') return { name: 'required' };
  if (name.length > ROUTINE_NAME_MAX_LENGTH) return { name: 'nameTooLong' };
  return {};
}

// What save_routine() receives: trimmed text, empty notes as null, and an
// id only for exercises that are already saved.
export function toSaveInput(draft: RoutineDraft, routineId: string | null): SaveRoutineInput {
  const notes = draft.notes.trim();
  return {
    id: routineId,
    name: draft.name.trim(),
    label: draft.label,
    notes: notes === '' ? null : notes,
    exercises: draft.exercises.map((exercise) => ({
      ...(exercise.id ? { id: exercise.id } : {}),
      exercise_id: exercise.exerciseId,
      planned_sets: exercise.plannedSets,
      rest_s: exercise.restS,
      group_key: exercise.groupKey,
      notes: exercise.notes,
    })),
  };
}

// True when saving would change something, i.e. there are unsaved changes.
export function hasChanges(draft: RoutineDraft, saved: RoutineDraft): boolean {
  return JSON.stringify(toSaveInput(draft, null)) !== JSON.stringify(toSaveInput(saved, null));
}

// Adds exercises at the end, with the default number of sets and no rest
// of their own (they use the exercise's default rest).
export function addExercises(draft: RoutineDraft, exerciseIds: readonly string[]): RoutineDraft {
  return {
    ...draft,
    exercises: [
      ...draft.exercises,
      ...exerciseIds.map((exerciseId) => ({
        key: newKey(),
        id: null,
        exerciseId,
        plannedSets: DEFAULT_PLANNED_SETS,
        restS: null,
        groupKey: null,
        notes: null,
      })),
    ],
  };
}

export function removeExercise(draft: RoutineDraft, key: string): RoutineDraft {
  return { ...draft, exercises: draft.exercises.filter((exercise) => exercise.key !== key) };
}

// Moves an exercise one place up (-1) or down (+1); nothing at the ends.
export function moveExercise(draft: RoutineDraft, key: string, direction: -1 | 1): RoutineDraft {
  const from = draft.exercises.findIndex((exercise) => exercise.key === key);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= draft.exercises.length) return draft;
  const exercises = [...draft.exercises];
  [exercises[from], exercises[to]] = [exercises[to], exercises[from]];
  return { ...draft, exercises };
}

export function setPlannedSets(draft: RoutineDraft, key: string, sets: number): RoutineDraft {
  const plannedSets = Math.min(PLANNED_SETS_MAX, Math.max(PLANNED_SETS_MIN, sets));
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.key === key ? { ...exercise, plannedSets } : exercise,
    ),
  };
}

export function setRest(draft: RoutineDraft, key: string, restS: number | null): RoutineDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.key === key ? { ...exercise, restS } : exercise,
    ),
  };
}
