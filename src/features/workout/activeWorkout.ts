import type { Exercise } from '@/features/exercises/exercise';
import { moveWithinGroups, withoutLoneGroups } from '@/features/routines/grouping';
import { NO_TARGETS, type ExerciseTargets, type Routine } from '@/features/routines/routine';

import type { NextSet, RestTimer } from './restTimer';
import type { ChangeReason, ExerciseChangeReason } from './session';

// The workout being done right now (US-13, US-15, US-22). It lives on the
// phone (workoutStore) until it's finished, then goes to the database in
// one call (finish_workout). Plain data, so it can be saved as JSON.
// Changes made here are for this workout only: the routine stays as it is.
// No React here.

// A set's numbers, the same fields as a plan (empty: not used, or not
// typed).
export type SetNumbers = ExerciseTargets;

export type SetType = 'normal' | 'drop';

export type ActiveSet = {
  // Made on the phone (data rule 5).
  id: string;
  // What the set is expected to be, shown in a softer colour.
  planned: SetNumbers;
  // What was typed over it; empty fields fall back to the plan.
  typed: SetNumbers;
  // A drop set (US-16), shown as "D".
  setType: SetType;
  // How hard it felt, 1–10, when you say (US-16).
  rpe: number | null;
  // When ✓ was tapped (data rule 7); null while not done.
  completedAt: string | null;
};

export type ActiveExercise = {
  id: string;
  exerciseId: string;
  // A copy, so names and columns show with no signal.
  exercise: Exercise;
  // The routine exercise it came from (data rule 1); null if added here.
  routineExerciseId: string | null;
  groupKey: string | null;
  // Rest after each set (in a superset or circuit, after each round), fixed
  // when the workout starts: the routine's, else the exercise's own, else
  // the app's. So it's known with no signal.
  restS: number;
  // The routine's note on it, shown during the workout.
  routineNote: string | null;
  // This workout's own note on it (saved with the session), as typed.
  notes: string;
  sets: ActiveSet[];
  // Last time's sets, to compare with (US-14): from this routine, else from
  // anywhere. Null until known, or if it was never done.
  previous: SetNumbers[] | null;
  // What happened to the plan in this workout (US-15).
  change: 'added' | 'swapped' | 'skipped' | null;
  // The exercise the routine had, when this one replaced it (a copy, for
  // its name with no signal).
  swappedFromId: string | null;
  replaced: Exercise | null;
  changeReason: ExerciseChangeReason | null;
};

export type ActiveWorkout = {
  id: string;
  // "2026-10-20".
  date: string;
  // What the week planned that day (null when it wasn't planned), and the
  // routine being done.
  plannedRoutineId: string | null;
  routineId: string | null;
  routineName: string;
  // Why it was swapped, when it was.
  changeReason: ChangeReason | null;
  startedAt: string;
  exercises: ActiveExercise[];
  // The rest running now, if any.
  rest: RestTimer | null;
  // Whether last time's numbers have been fetched yet (they need signal).
  lastTimeLoaded: boolean;
};

// Finished, waiting to be saved to the database.
export type FinishedWorkout = ActiveWorkout & { endedAt: string };

function newSet(id: string, planned: SetNumbers = NO_TARGETS): ActiveSet {
  return { id, planned, typed: NO_TARGETS, setType: 'normal', rpe: null, completedAt: null };
}

type StartOptions = {
  date: string;
  plannedRoutineId: string | null;
  changeReason: ChangeReason | null;
  startedAt: string;
  newId: () => string;
  // The rest for an exercise the routine sets none for.
  defaultRestS: (exerciseId: string) => number;
};

// Starting a workout copies the routine (data rule 1): its exercises, in
// order, with one set per planned set, pre-filled with the plan.
export function workoutFromRoutine(routine: Routine, options: StartOptions): ActiveWorkout {
  return {
    id: options.newId(),
    date: options.date,
    plannedRoutineId: options.plannedRoutineId,
    routineId: routine.id,
    routineName: routine.name,
    changeReason: options.changeReason,
    startedAt: options.startedAt,
    rest: null,
    lastTimeLoaded: false,
    exercises: routine.exercises.map((item) => ({
      id: options.newId(),
      exerciseId: item.exerciseId,
      exercise: item.exercise,
      routineExerciseId: item.id,
      groupKey: item.groupKey,
      restS: item.restS ?? options.defaultRestS(item.exerciseId),
      routineNote: item.notes,
      notes: '',
      sets: item.sets.map((planned) => newSet(options.newId(), planned)),
      previous: null,
      change: null,
      swappedFromId: null,
      replaced: null,
      changeReason: null,
    })),
  };
}

// An exercise's sets the last time it was done (see last_sets()): in this
// routine, and anywhere.
export type LastTime = { routine: SetNumbers[]; any: SetNumbers[] };

function hasNumbers(numbers: SetNumbers): boolean {
  return Object.values(numbers).some((value) => value !== null);
}

// Pre-fills an exercise from last time (US-13), with Alba's rule: last time
// in this routine; the first time, the routine's plan; without a plan, last
// time anywhere. Row by row; extra rows take last time's last set.
export function withLastTime(exercise: ActiveExercise, last: LastTime | undefined): ActiveExercise {
  const inRoutine = last?.routine ?? [];
  const anywhere = last?.any ?? [];
  const hasPlan = exercise.sets.some((set) => hasNumbers(set.planned));
  const source =
    inRoutine.length > 0 ? inRoutine : hasPlan ? null : anywhere.length > 0 ? anywhere : null;
  return {
    ...exercise,
    previous: inRoutine.length > 0 ? inRoutine : anywhere.length > 0 ? anywhere : null,
    sets: source
      ? exercise.sets.map((set, index) => ({
          ...set,
          planned: source[index] ?? source[source.length - 1],
        }))
      : exercise.sets,
  };
}

export function applyLastTime(
  workout: ActiveWorkout,
  lastTime: Record<string, LastTime>,
): ActiveWorkout {
  return {
    ...workout,
    lastTimeLoaded: true,
    exercises: workout.exercises.map((exercise) =>
      withLastTime(exercise, lastTime[exercise.exerciseId]),
    ),
  };
}

// Last time for some exercises only: ones added or swapped in.
export function applyLastTimeTo(
  workout: ActiveWorkout,
  ids: readonly string[],
  lastTime: Record<string, LastTime>,
): ActiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) =>
      ids.includes(exercise.id) ? withLastTime(exercise, lastTime[exercise.exerciseId]) : exercise,
    ),
  };
}

// The numbers a set shows, and is saved with: what was typed, else the plan.
export function shownNumbers(set: ActiveSet): SetNumbers {
  const fields = Object.keys(NO_TARGETS) as (keyof SetNumbers)[];
  return Object.fromEntries(
    fields.map((field) => [field, set.typed[field] ?? set.planned[field]]),
  ) as SetNumbers;
}

function updateExercise(
  workout: ActiveWorkout,
  exerciseId: string,
  change: (exercise: ActiveExercise) => ActiveExercise,
): ActiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) =>
      exercise.id === exerciseId ? change(exercise) : exercise,
    ),
  };
}

function updateSet(
  workout: ActiveWorkout,
  exerciseId: string,
  setId: string,
  change: (set: ActiveSet) => ActiveSet,
): ActiveWorkout {
  return updateExercise(workout, exerciseId, (exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => (set.id === setId ? change(set) : set)),
  }));
}

// Numbers typed into a set (see SetRow).
export function updateTyped(
  workout: ActiveWorkout,
  exerciseId: string,
  setId: string,
  update: (typed: SetNumbers) => SetNumbers,
): ActiveWorkout {
  return updateSet(workout, exerciseId, setId, (set) => ({ ...set, typed: update(set.typed) }));
}

// ✓: done, with the numbers it shows (pre-filled ones too: if you did what
// was planned, it's one tap). Tapped again, it's not done any more.
export function toggleSet(
  workout: ActiveWorkout,
  exerciseId: string,
  setId: string,
  now: string,
): ActiveWorkout {
  return updateSet(workout, exerciseId, setId, (set) =>
    set.completedAt === null
      ? { ...set, typed: shownNumbers(set), completedAt: now }
      : { ...set, completedAt: null },
  );
}

// Mid-workout changes (US-15, US-16). They change this workout only.

// "+ Afegeix una sèrie": pre-filled with the last set's numbers.
export function addSet(workout: ActiveWorkout, exerciseId: string, newId: string): ActiveWorkout {
  return updateExercise(workout, exerciseId, (exercise) => {
    const last = exercise.sets.at(-1);
    return {
      ...exercise,
      sets: [...exercise.sets, newSet(newId, last ? shownNumbers(last) : NO_TARGETS)],
    };
  });
}

// "Treu la sèrie". An exercise keeps at least one; to do none, skip it.
export function removeSet(workout: ActiveWorkout, exerciseId: string, setId: string): ActiveWorkout {
  return updateExercise(workout, exerciseId, (exercise) =>
    exercise.sets.length <= 1
      ? exercise
      : { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) },
  );
}

export function setSetType(
  workout: ActiveWorkout,
  exerciseId: string,
  setId: string,
  setType: SetType,
): ActiveWorkout {
  return updateSet(workout, exerciseId, setId, (set) => ({ ...set, setType }));
}

export function setRpe(
  workout: ActiveWorkout,
  exerciseId: string,
  setId: string,
  rpe: number | null,
): ActiveWorkout {
  return updateSet(workout, exerciseId, setId, (set) => ({ ...set, rpe }));
}

// "+ Afegeix exercicis": at the end, one empty set each (last time fills it
// in once it's known).
export function addExercises(
  workout: ActiveWorkout,
  added: readonly { exercise: Exercise; restS: number }[],
  newId: () => string,
): ActiveWorkout {
  return {
    ...workout,
    exercises: [
      ...workout.exercises,
      ...added.map(({ exercise, restS }) => ({
        id: newId(),
        exerciseId: exercise.id,
        exercise,
        routineExerciseId: null,
        groupKey: null,
        restS,
        routineNote: null,
        notes: '',
        sets: [newSet(newId())],
        previous: null,
        change: 'added' as const,
        swappedFromId: null,
        replaced: null,
        changeReason: null,
      })),
    ],
  };
}

// "Treu l'exercici": only for one added in this workout. (One from the
// routine is skipped instead, so the plan still shows it wasn't done.)
export function removeExercise(workout: ActiveWorkout, exerciseId: string): ActiveWorkout {
  return {
    ...workout,
    exercises: withoutLoneGroups(
      workout.exercises.filter((exercise) => exercise.id !== exerciseId),
    ),
  };
}

// "Salta l'exercici", with an optional reason; null undoes it.
export function skipExercise(
  workout: ActiveWorkout,
  exerciseId: string,
  skip: { reason: ExerciseChangeReason | null } | null,
): ActiveWorkout {
  return updateExercise(workout, exerciseId, (exercise) =>
    skip
      ? { ...exercise, change: 'skipped', changeReason: skip.reason }
      : {
          ...exercise,
          change: exercise.swappedFromId ? 'swapped' : null,
          changeReason: exercise.swappedFromId ? exercise.changeReason : null,
        },
  );
}

// Whether an exercise can still be swapped: not once a set of it is done,
// or those sets would end up under the wrong exercise.
export function canSwap(exercise: ActiveExercise): boolean {
  return exercise.sets.every((set) => set.completedAt === null);
}

// "Canvia l'exercici": another exercise in its place, with the same number
// of empty sets (last time fills them in once it's known). It remembers the
// routine's exercise it replaced.
export function swapExercise(
  workout: ActiveWorkout,
  exerciseId: string,
  replacement: Exercise,
  reason: ExerciseChangeReason | null,
  newId: () => string,
): ActiveWorkout {
  return updateExercise(workout, exerciseId, (exercise) => {
    if (!canSwap(exercise)) return exercise;
    const added = exercise.change === 'added';
    return {
      ...exercise,
      exerciseId: replacement.id,
      exercise: replacement,
      sets: exercise.sets.map(() => newSet(newId())),
      previous: null,
      change: added ? 'added' : 'swapped',
      swappedFromId: added ? null : (exercise.swappedFromId ?? exercise.exerciseId),
      replaced: added ? null : (exercise.replaced ?? exercise.exercise),
      changeReason: added ? null : reason,
    };
  });
}

export function setExerciseNotes(
  workout: ActiveWorkout,
  exerciseId: string,
  notes: string,
): ActiveWorkout {
  return updateExercise(workout, exerciseId, (exercise) => ({ ...exercise, notes }));
}

// A drag in the reorder sheet: dropped inside a superset, it joins it (and
// its rest); dragged out, it leaves it.
export function dropWorkoutExercise(
  exercises: readonly ActiveExercise[],
  fromIndex: number,
  toIndex: number,
): ActiveExercise[] {
  return moveWithinGroups(exercises, fromIndex, toIndex, (item, member, groupKey) => ({
    ...item,
    groupKey,
    restS: member.restS,
  }));
}

// Supersets and circuits (US-08): exercises with the same groupKey, next to
// each other. One exercise on its own, or a whole group, in order.
export type WorkoutSegment = { groupKey: string | null; exercises: ActiveExercise[] };

export function workoutSegments(workout: ActiveWorkout): WorkoutSegment[] {
  const segments: WorkoutSegment[] = [];
  for (const exercise of workout.exercises) {
    const last = segments.at(-1);
    if (exercise.groupKey !== null && last?.groupKey === exercise.groupKey) {
      last.exercises.push(exercise);
    } else {
      segments.push({ groupKey: exercise.groupKey, exercises: [exercise] });
    }
  }
  return segments;
}

type OrderedSet = NextSet & { done: boolean; groupKey: string | null; round: number };

// The order sets are done in: an exercise's sets one after another; in a
// superset or circuit, round by round across its exercises (face pull 1,
// curl 1, face pull 2, curl 2…). Skipped exercises have none to do.
export function workoutOrder(workout: ActiveWorkout): OrderedSet[] {
  return workoutSegments(workout).flatMap(({ groupKey, exercises: all }) => {
    const exercises = all.filter((exercise) => exercise.change !== 'skipped');
    if (exercises.length === 0) return [];
    const rounds = Math.max(...exercises.map((exercise) => exercise.sets.length));
    const order: OrderedSet[] = [];
    for (let round = 0; round < (groupKey === null ? 1 : rounds); round += 1) {
      for (const exercise of exercises) {
        const sets = groupKey === null ? exercise.sets : exercise.sets.slice(round, round + 1);
        sets.forEach((set, index) =>
          order.push({
            exerciseId: exercise.id,
            setId: set.id,
            done: set.completedAt !== null,
            groupKey,
            round: groupKey === null ? index : round,
          }),
        );
      }
    }
    return order;
  });
}

// The next set to do: the first not done after `setId` in the workout's
// order, else the first not done anywhere. Null when every set is done.
export function nextSet(workout: ActiveWorkout, setId?: string): NextSet | null {
  const order = workoutOrder(workout);
  const from = setId === undefined ? -1 : order.findIndex((item) => item.setId === setId);
  const found =
    order.slice(from + 1).find((item) => !item.done) ?? order.find((item) => !item.done);
  return found ? { exerciseId: found.exerciseId, setId: found.setId } : null;
}

// After a set is ticked: how long to rest, and what comes next. In a
// superset or circuit, no rest between its exercises: straight to the next
// one in the round, then rest at the end of the round (flow 2). No rest
// once every set is done.
export function afterSet(
  workout: ActiveWorkout,
  setId: string,
): { restS: number | null; next: NextSet | null } {
  const order = workoutOrder(workout);
  const index = order.findIndex((item) => item.setId === setId);
  const current = order[index];
  const next = nextSet(workout, setId);
  if (!current || !next) return { restS: null, next };

  const following = order[index + 1];
  const midRound =
    current.groupKey !== null &&
    following?.groupKey === current.groupKey &&
    following.round === current.round;
  const restS = workout.exercises.find((exercise) => exercise.id === current.exerciseId)?.restS;
  return { restS: midRound || !restS ? null : restS, next };
}

// Sets done and still to do; skipped exercises don't count.
export function countSets(workout: ActiveWorkout): { done: number; total: number } {
  const sets = workout.exercises
    .filter((exercise) => exercise.change !== 'skipped')
    .flatMap((exercise) => exercise.sets);
  return { done: sets.filter((set) => set.completedAt !== null).length, total: sets.length };
}

// What finish_workout() receives: only the sets that were done, and only
// the exercises that have some, plus the skipped ones (so the plan shows
// they weren't done, and why).
export function toFinishPayload(workout: FinishedWorkout) {
  return {
    id: workout.id,
    date: workout.date,
    planned_routine_id: workout.plannedRoutineId,
    routine_id: workout.routineId,
    change_reason: workout.changeReason,
    started_at: workout.startedAt,
    ended_at: workout.endedAt,
    energy: null,
    notes: null,
    exercises: workout.exercises
      .map((exercise) => ({
        id: exercise.id,
        exercise_id: exercise.exerciseId,
        routine_exercise_id: exercise.routineExerciseId,
        group_key: exercise.groupKey,
        rest_s: exercise.restS,
        change: exercise.change,
        swapped_from_id: exercise.swappedFromId,
        change_reason: exercise.changeReason,
        notes: exercise.notes.trim() === '' ? null : exercise.notes.trim(),
        sets:
          exercise.change === 'skipped'
            ? []
            : exercise.sets
                .filter((set) => set.completedAt !== null)
                .map((set) => {
                  const numbers = shownNumbers(set);
                  return {
                    id: set.id,
                    set_type: set.setType,
                    weight_kg: numbers.weightKg,
                    reps: numbers.reps,
                    duration_s: numbers.durationS,
                    distance_m: numbers.distanceM,
                    speed_kmh: numbers.speedKmh,
                    incline_pct: numbers.inclinePct,
                    level: numbers.level,
                    rpe: set.rpe,
                    completed_at: set.completedAt,
                  };
                }),
      }))
      .filter((exercise) => exercise.sets.length > 0 || exercise.change === 'skipped'),
  };
}

// A workout saved on the phone by an older version of the app, brought up
// to date: fields added since get their defaults.
export function upgradeWorkout<T extends ActiveWorkout>(saved: T): T {
  return {
    ...saved,
    rest: saved.rest ?? null,
    lastTimeLoaded: saved.lastTimeLoaded ?? false,
    exercises: saved.exercises.map((exercise) => {
      // Before, `notes` held the routine's note.
      const old = exercise as ActiveExercise & { notes: string | null };
      return {
        ...exercise,
        routineNote: exercise.routineNote ?? old.notes ?? null,
        notes: exercise.routineNote === undefined ? '' : (exercise.notes ?? ''),
        previous: exercise.previous ?? null,
        change: exercise.change ?? null,
        swappedFromId: exercise.swappedFromId ?? null,
        replaced: exercise.replaced ?? null,
        changeReason: exercise.changeReason ?? null,
        sets: exercise.sets.map((set) => ({
          ...set,
          setType: set.setType ?? 'normal',
          rpe: set.rpe ?? null,
        })),
      };
    }),
  };
}
