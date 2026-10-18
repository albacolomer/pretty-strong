import type { SaveRoutineInput } from './api';
import {
  DEFAULT_INTERVALS,
  DEFAULT_RECOVERY_S,
  isRunBlockComplete,
  runBlockKind,
  type RunBlockKind,
} from './runBlocks';
import {
  DEFAULT_PLANNED_DURATION_S,
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

// One planned set while the routine is being edited: its first-time plan.
// `key` keeps each row's typed numbers in place when a set above it goes.
export type DraftSet = {
  key: string;
  targets: ExerciseTargets;
};

// One exercise while the routine is being edited. `key` identifies it in
// the list; `id` is its database id, or null until it's first saved.
export type DraftExercise = {
  key: string;
  id: string | null;
  exerciseId: string;
  restS: number | null;
  groupKey: string | null;
  // As typed; saved as null when empty.
  notes: string;
  // At least one, in order.
  sets: DraftSet[];
  // In a run routine: the kind of block it was added as. Null: it follows
  // from its numbers (see runBlockKind), as for blocks loaded from the
  // database.
  runBlock: RunBlockKind | null;
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

function newSet(targets: ExerciseTargets = NO_TARGETS): DraftSet {
  return { key: newKey(), targets };
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
      restS: exercise.restS,
      groupKey: exercise.groupKey,
      notes: exercise.notes ?? '',
      sets: exercise.sets.map((targets) => newSet(targets)),
      runBlock: null,
    })),
  };
}

// Each error is also the last part of its translation key:
// routines.editor.errors.<error>.
export type RoutineDraftError = 'required' | 'nameTooLong' | 'blocksIncomplete';
export type RoutineDraftErrors = Partial<Record<'name' | 'blocks', RoutineDraftError>>;

export function validateRoutineDraft(draft: RoutineDraft): RoutineDraftErrors {
  const errors: RoutineDraftErrors = {};
  const name = draft.name.trim();
  if (name === '') errors.name = 'required';
  else if (name.length > ROUTINE_NAME_MAX_LENGTH) errors.name = 'nameTooLong';
  if (
    draft.label === 'run' &&
    draft.exercises.some((block) => !isRunBlockComplete(blockKindOf(block), blockTargets(block)))
  ) {
    errors.blocks = 'blocksIncomplete';
  }
  return errors;
}

// The kind of a run block: as added, or from its numbers.
export function blockKindOf(block: DraftExercise): RunBlockKind {
  return block.runBlock ?? runBlockKind(block.sets.map((set) => set.targets));
}

// A run block's numbers: its sets are all alike, so the first one's.
export function blockTargets(block: DraftExercise): ExerciseTargets {
  return block.sets[0]?.targets ?? NO_TARGETS;
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
      rest_s: exercise.restS,
      group_key: exercise.groupKey,
      notes: emptyAsNull(exercise.notes),
      sets: exercise.sets.map(({ targets }) => ({
        target_weight_kg: targets.weightKg,
        target_reps: targets.reps,
        target_duration_s: targets.durationS,
        target_distance_m: targets.distanceM,
        target_speed_kmh: targets.speedKmh,
        target_incline_pct: targets.inclinePct,
        target_level: targets.level,
      })),
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
// has none yet. A class holds no exercises, and a run only run blocks, so
// anything else is taken out (the editor offers to undo it).
export function setLabel(
  draft: RoutineDraft,
  label: RoutineLabel,
  isRunExercise: (exerciseId: string) => boolean,
): RoutineDraft {
  let exercises = usesExercises(label) ? draft.exercises : [];
  if (label === 'run') {
    // Blocks follow each other: no supersets.
    exercises = withoutLoneGroups(
      exercises.filter((exercise) => isRunExercise(exercise.exerciseId)),
    ).map((exercise) => ({ ...exercise, groupKey: null }));
  }
  return {
    ...draft,
    label,
    plannedDurationS:
      usesPlannedDuration(label) && draft.plannedDurationS === null
        ? DEFAULT_PLANNED_DURATION_S
        : draft.plannedDurationS,
    exercises,
  };
}

// Adds a run block at the end: one repetition, or 6 with 1:30 recovery.
export function addRunBlock(
  draft: RoutineDraft,
  kind: RunBlockKind,
  runExerciseId: string,
): RoutineDraft {
  const intervals = kind === 'intervals';
  return {
    ...draft,
    exercises: [
      ...draft.exercises,
      {
        key: newKey(),
        id: null,
        exerciseId: runExerciseId,
        restS: intervals ? DEFAULT_RECOVERY_S : null,
        groupKey: null,
        notes: '',
        sets: Array.from({ length: intervals ? DEFAULT_INTERVALS : 1 }, () => newSet()),
        runBlock: kind,
      },
    ],
  };
}

// A run block's repetitions: that many sets, all with the block's numbers.
export function setRepetitions(draft: RoutineDraft, key: string, count: number): RoutineDraft {
  const length = clampSets(count);
  return updateExercise(draft, key, (block) => ({
    ...block,
    sets: Array.from({ length }, (_, index) => block.sets[index] ?? newSet(blockTargets(block))),
  }));
}

// A run block's numbers, the same for every repetition.
export function updateBlockTargets(
  draft: RoutineDraft,
  key: string,
  update: (targets: ExerciseTargets) => ExerciseTargets,
): RoutineDraft {
  return updateExercise(draft, key, (block) => ({
    ...block,
    sets: block.sets.map((set) => ({ ...set, targets: update(set.targets) })),
  }));
}

// Adds or takes off a day of the week.
export function toggleWeekday(draft: RoutineDraft, day: Weekday): RoutineDraft {
  return {
    ...draft,
    weekdays: draft.weekdays.includes(day)
      ? draft.weekdays.filter((other) => other !== day)
      : [...draft.weekdays, day],
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

// Adds exercises at the end, each with one empty set (add more with
// "Afegeix una sèrie") and no rest of its own (it uses the exercise's).
export function addExercises(draft: RoutineDraft, exerciseIds: readonly string[]): RoutineDraft {
  return {
    ...draft,
    exercises: [
      ...draft.exercises,
      ...exerciseIds.map((exerciseId) => ({
        key: newKey(),
        id: null,
        exerciseId,
        restS: null,
        groupKey: null,
        notes: '',
        sets: [newSet()],
        runBlock: null,
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

// "Afegeix una sèrie": a copy of the last set, so 4 × 10 at 60 kg is one row
// typed and three taps. In a superset or circuit every exercise gets one,
// so the rounds stay aligned.
export function addSet(draft: RoutineDraft, key: string): RoutineDraft {
  return updateWithGroup(draft, key, (exercise) =>
    exercise.sets.length >= PLANNED_SETS_MAX
      ? exercise
      : { ...exercise, sets: [...exercise.sets, newSet(exercise.sets.at(-1)?.targets)] },
  );
}

// "Treu la sèrie". In a superset or circuit, that round goes from every
// exercise. The last set stays: an exercise needs at least one.
export function removeSet(draft: RoutineDraft, key: string, setKey: string): RoutineDraft {
  const item = draft.exercises.find((exercise) => exercise.key === key);
  const index = item?.sets.findIndex((set) => set.key === setKey) ?? -1;
  if (!item || index === -1 || item.sets.length <= PLANNED_SETS_MIN) return draft;
  return updateWithGroup(draft, key, (exercise) => ({
    ...exercise,
    sets: exercise.sets.filter((_, position) => position !== index),
  }));
}

// One set's first-time plan (see SetTable).
export function updateSetTargets(
  draft: RoutineDraft,
  key: string,
  setKey: string,
  update: (targets: ExerciseTargets) => ExerciseTargets,
): RoutineDraft {
  return updateExercise(draft, key, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) =>
      set.key === setKey ? { ...set, targets: update(set.targets) } : set,
    ),
  }));
}

// Rest; in a superset or circuit, the rest after each round of the group.
export function setRest(draft: RoutineDraft, key: string, restS: number | null): RoutineDraft {
  return updateWithGroup(draft, key, (exercise) => ({ ...exercise, restS }));
}

// This routine's note on one exercise, e.g. "agafada ampla".
export function setExerciseNotes(draft: RoutineDraft, key: string, notes: string): RoutineDraft {
  return updateExercise(draft, key, (exercise) => ({ ...exercise, notes }));
}

function clampSets(count: number): number {
  return Math.min(PLANNED_SETS_MAX, Math.max(PLANNED_SETS_MIN, count));
}

function updateExercise(
  draft: RoutineDraft,
  key: string,
  change: (exercise: DraftExercise) => DraftExercise,
): RoutineDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.key === key ? change(exercise) : exercise,
    ),
  };
}

// Changes one exercise, or its whole superset or circuit.
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
// have the same number of sets (one per round), and share the rest after
// each round.

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
// `key` itself), with the group's rest. Grouped with a third, it becomes a
// circuit.
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
  return { ...draft, exercises: withAlignedRounds(withoutLoneGroups(exercises)) };
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
  return withAlignedRounds(withoutLoneGroups(list));
}

// `item` joins `groupKey`, taking the rest of `member`.
function joinGroup(item: DraftExercise, member: DraftExercise, groupKey: string): DraftExercise {
  return { ...item, groupKey, restS: member.restS };
}

// Every exercise of a group gets as many sets as the one with the most,
// each copying its own last set, so no planned set is ever lost.
function withAlignedRounds(exercises: DraftExercise[]): DraftExercise[] {
  const rounds = new Map<string, number>();
  for (const { groupKey, sets } of exercises) {
    if (groupKey !== null) rounds.set(groupKey, Math.max(rounds.get(groupKey) ?? 0, sets.length));
  }
  return exercises.map((exercise) => {
    const length = exercise.groupKey === null ? 0 : (rounds.get(exercise.groupKey) ?? 0);
    if (exercise.sets.length >= length) return exercise;
    const last = exercise.sets.at(-1)?.targets;
    return {
      ...exercise,
      sets: [
        ...exercise.sets,
        ...Array.from({ length: length - exercise.sets.length }, () => newSet(last)),
      ],
    };
  });
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
