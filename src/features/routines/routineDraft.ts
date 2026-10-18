import type { SaveRoutineInput } from './api';
import {
  DEFAULT_PLANNED_DURATION_S,
  DEFAULT_PLANNED_SETS,
  NO_TARGETS,
  PLANNED_DURATION_MAX_S,
  PLANNED_DURATION_MIN_S,
  PLANNED_SETS_MAX,
  PLANNED_SETS_MIN,
  ROUTINE_NAME_MAX_LENGTH,
  type ExerciseTargets,
  type Routine,
  type RoutineLabel,
  type Weekday,
  usesExercises,
  usesPlannedDuration,
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
  // As typed; saved as null when empty.
  notes: string;
  targets: ExerciseTargets;
};

export type RoutineDraft = {
  name: string;
  label: RoutineLabel;
  // As typed; only kept for custom routines.
  customLabel: string;
  plannedDurationS: number | null;
  notes: string;
  weekdays: Weekday[];
  exercises: DraftExercise[];
};

let lastKey = 0;
function newKey(): string {
  lastKey += 1;
  return `new-${lastKey}`;
}

export function emptyRoutineDraft(): RoutineDraft {
  return {
    name: '',
    label: 'strength',
    customLabel: '',
    plannedDurationS: null,
    notes: '',
    weekdays: [],
    exercises: [],
  };
}

export function draftFromRoutine(routine: Routine): RoutineDraft {
  return {
    name: routine.name,
    label: routine.label,
    customLabel: routine.customLabel ?? '',
    plannedDurationS: routine.plannedDurationS,
    notes: routine.notes ?? '',
    weekdays: routine.weekdays,
    exercises: routine.exercises.map((exercise) => ({
      key: exercise.id,
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      plannedSets: exercise.plannedSets,
      restS: exercise.restS,
      groupKey: exercise.groupKey,
      notes: exercise.notes ?? '',
      targets: exercise.targets,
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
  return {
    id: routineId,
    name: draft.name.trim(),
    label: draft.label,
    customLabel: draft.label === 'custom' ? emptyAsNull(draft.customLabel) : null,
    // Kept in the draft while you try other types, but only saved for those
    // that use it.
    plannedDurationS: usesPlannedDuration(draft.label) ? draft.plannedDurationS : null,
    notes: emptyAsNull(draft.notes),
    // Monday first, so the order of taps doesn't count as a change.
    weekdays: [...draft.weekdays].sort((a, b) => a - b),
    exercises: draft.exercises.map((exercise) => ({
      ...(exercise.id ? { id: exercise.id } : {}),
      exercise_id: exercise.exerciseId,
      planned_sets: exercise.plannedSets,
      rest_s: exercise.restS,
      group_key: exercise.groupKey,
      notes: emptyAsNull(exercise.notes),
      target_weight_kg: exercise.targets.weightKg,
      target_reps: exercise.targets.reps,
      target_duration_s: exercise.targets.durationS,
      target_distance_m: exercise.targets.distanceM,
      target_speed_kmh: exercise.targets.speedKmh,
      target_incline_pct: exercise.targets.inclinePct,
      target_level: exercise.targets.level,
    })),
  };
}

function emptyAsNull(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

// True when saving would change something, i.e. there are unsaved changes.
export function hasChanges(draft: RoutineDraft, saved: RoutineDraft): boolean {
  return JSON.stringify(toSaveInput(draft, null)) !== JSON.stringify(toSaveInput(saved, null));
}

// Changes the type. A type with a planned duration starts at 1 hour if it
// has none yet. A class holds no exercises, so they're taken out (the
// editor offers to undo it).
export function setLabel(draft: RoutineDraft, label: RoutineLabel): RoutineDraft {
  return {
    ...draft,
    label,
    plannedDurationS:
      usesPlannedDuration(label) && draft.plannedDurationS === null
        ? DEFAULT_PLANNED_DURATION_S
        : draft.plannedDurationS,
    exercises: usesExercises(label) ? draft.exercises : [],
  };
}

// Null: no planned duration.
export function setPlannedDuration(draft: RoutineDraft, seconds: number | null): RoutineDraft {
  return {
    ...draft,
    plannedDurationS:
      seconds === null
        ? null
        : Math.min(PLANNED_DURATION_MAX_S, Math.max(PLANNED_DURATION_MIN_S, seconds)),
  };
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
        notes: '',
        targets: NO_TARGETS,
      })),
    ],
  };
}

export function removeExercise(draft: RoutineDraft, key: string): RoutineDraft {
  return {
    ...draft,
    exercises: withoutLoneGroups(draft.exercises.filter((exercise) => exercise.key !== key)),
  };
}

// Planned sets; in a superset or circuit, the rounds of the whole group.
export function setPlannedSets(draft: RoutineDraft, key: string, sets: number): RoutineDraft {
  const plannedSets = Math.min(PLANNED_SETS_MAX, Math.max(PLANNED_SETS_MIN, sets));
  return updateWithGroup(draft, key, (exercise) => ({ ...exercise, plannedSets }));
}

// Rest; in a superset or circuit, the rest after each round of the group.
export function setRest(draft: RoutineDraft, key: string, restS: number | null): RoutineDraft {
  return updateWithGroup(draft, key, (exercise) => ({ ...exercise, restS }));
}

function updateWithGroup(
  draft: RoutineDraft,
  key: string,
  change: (exercise: DraftExercise) => DraftExercise,
): RoutineDraft {
  const item = draft.exercises.find((exercise) => exercise.key === key);
  if (!item) return draft;
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.key === key || (item.groupKey !== null && exercise.groupKey === item.groupKey)
        ? change(exercise)
        : exercise,
    ),
  };
}

// Supersets and circuits (US-08). Exercises with the same groupKey are a
// superset (2) or a circuit (3 or more). They always sit next to each other,
// and share their rounds (plannedSets) and the rest after each round.

// One exercise on its own (groupKey null), or a whole group, in order.
export type ExerciseSegment = { groupKey: string | null; items: DraftExercise[] };

export function exerciseSegments(exercises: readonly DraftExercise[]): ExerciseSegment[] {
  const segments: ExerciseSegment[] = [];
  for (const exercise of exercises) {
    const last = segments.at(-1);
    if (exercise.groupKey !== null && last?.groupKey === exercise.groupKey) {
      last.items.push(exercise);
    } else {
      segments.push({ groupKey: exercise.groupKey, items: [exercise] });
    }
  }
  return segments;
}

// Puts `otherKey` in a superset with `key`: right after `key`'s group (or
// `key` itself), with the group's rounds and rest. Grouped with a third,
// it becomes a circuit.
export function makeSuperset(draft: RoutineDraft, key: string, otherKey: string): RoutineDraft {
  const target = draft.exercises.find((exercise) => exercise.key === key);
  const other = draft.exercises.find((exercise) => exercise.key === otherKey);
  if (!target || !other || key === otherKey) return draft;
  if (target.groupKey !== null && other.groupKey === target.groupKey) return draft;

  const groupKey = target.groupKey ?? newGroupKey(draft.exercises);
  const exercises = draft.exercises
    .filter((exercise) => exercise.key !== otherKey)
    .map((exercise) => (exercise.key === key ? { ...exercise, groupKey } : exercise));
  const lastInGroup = exercises.findLastIndex((exercise) => exercise.groupKey === groupKey);
  exercises.splice(lastInGroup + 1, 0, joinGroup(other, target, groupKey));
  return { ...draft, exercises: withoutLoneGroups(exercises) };
}

// Takes an exercise out of its group, to just after it, so the group stays
// together.
export function leaveSuperset(draft: RoutineDraft, key: string): RoutineDraft {
  const item = draft.exercises.find((exercise) => exercise.key === key);
  if (!item?.groupKey) return draft;

  const exercises = draft.exercises.filter((exercise) => exercise.key !== key);
  const lastInGroup = exercises.findLastIndex((exercise) => exercise.groupKey === item.groupKey);
  exercises.splice(lastInGroup + 1, 0, { ...item, groupKey: null });
  return { ...draft, exercises: withoutLoneGroups(exercises) };
}

// Moves one exercise to a new place, as a drag in the reorder sheet does.
// Dropped between two exercises of a group, it joins that group; moved away
// from its own group, it leaves it.
export function dropExercise(
  exercises: readonly DraftExercise[],
  fromIndex: number,
  toIndex: number,
): DraftExercise[] {
  const list = [...exercises];
  const [moved] = list.splice(fromIndex, 1);
  if (!moved) return list;
  list.splice(toIndex, 0, moved);

  const above = list[toIndex - 1];
  const below = list[toIndex + 1];
  if (above?.groupKey && above.groupKey === below?.groupKey) {
    list[toIndex] = joinGroup(moved, above, above.groupKey);
  } else if (
    moved.groupKey === null ||
    (above?.groupKey !== moved.groupKey && below?.groupKey !== moved.groupKey)
  ) {
    list[toIndex] = { ...moved, groupKey: null };
  }
  return withoutLoneGroups(list);
}

// `item` joins `groupKey`, taking the rounds and rest of `member`.
function joinGroup(item: DraftExercise, member: DraftExercise, groupKey: string): DraftExercise {
  return { ...item, groupKey, plannedSets: member.plannedSets, restS: member.restS };
}

// A group needs at least two exercises; one left on its own is ungrouped.
function withoutLoneGroups(exercises: DraftExercise[]): DraftExercise[] {
  const sizes = new Map<string, number>();
  for (const { groupKey } of exercises) {
    if (groupKey !== null) sizes.set(groupKey, (sizes.get(groupKey) ?? 0) + 1);
  }
  return exercises.map((exercise) =>
    exercise.groupKey !== null && sizes.get(exercise.groupKey) === 1
      ? { ...exercise, groupKey: null }
      : exercise,
  );
}

// "g1", "g2"…: the first one this routine doesn't use yet.
function newGroupKey(exercises: readonly DraftExercise[]): string {
  const used = new Set(exercises.map((exercise) => exercise.groupKey));
  let number = 1;
  while (used.has(`g${number}`)) number += 1;
  return `g${number}`;
}

// The first-time plan for one exercise (see TargetFields).
export function updateTargets(
  draft: RoutineDraft,
  key: string,
  update: (targets: ExerciseTargets) => ExerciseTargets,
): RoutineDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.key === key ? { ...exercise, targets: update(exercise.targets) } : exercise,
    ),
  };
}

// This routine's note on one exercise, e.g. "agafada ampla".
export function setExerciseNotes(draft: RoutineDraft, key: string, notes: string): RoutineDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.key === key ? { ...exercise, notes } : exercise,
    ),
  };
}
