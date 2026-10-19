import type { Exercise } from '@/features/exercises/exercise';
import { NO_TARGETS, type ExerciseTargets, type Routine } from '@/features/routines/routine';

import type { NextSet, RestTimer } from './restTimer';
import type { ChangeReason } from './session';

// The workout being done right now (US-13, US-22). It lives on the phone
// (workoutStore) until it's finished, then goes to the database in one
// call (finish_workout). Plain data, so it can be saved as JSON. No React
// here.

// A set's numbers, the same fields as a plan (empty: not used, or not
// typed).
export type SetNumbers = ExerciseTargets;

export type ActiveSet = {
  // Made on the phone (data rule 5).
  id: string;
  // What the set is expected to be, shown in a softer colour.
  planned: SetNumbers;
  // What was typed over it; empty fields fall back to the plan.
  typed: SetNumbers;
  // When ✓ was tapped (data rule 7); null while not done.
  completedAt: string | null;
};

export type ActiveExercise = {
  id: string;
  exerciseId: string;
  // A copy, so names and columns show with no signal.
  exercise: Exercise;
  // The routine exercise it came from (data rule 1).
  routineExerciseId: string | null;
  groupKey: string | null;
  // Rest after each set (in a superset or circuit, after each round), fixed
  // when the workout starts: the routine's, else the exercise's own, else
  // the app's. So it's known with no signal.
  restS: number;
  // The routine's note on it, shown during the workout.
  notes: string | null;
  sets: ActiveSet[];
  // Last time's sets, to compare with (US-14): from this routine, else from
  // anywhere. Null until known, or if it was never done.
  previous: SetNumbers[] | null;
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
      notes: item.notes,
      sets: item.sets.map((planned) => ({
        id: options.newId(),
        planned,
        typed: NO_TARGETS,
        completedAt: null,
      })),
      previous: null,
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

// The numbers a set shows, and is saved with: what was typed, else the plan.
export function shownNumbers(set: ActiveSet): SetNumbers {
  const fields = Object.keys(NO_TARGETS) as (keyof SetNumbers)[];
  return Object.fromEntries(
    fields.map((field) => [field, set.typed[field] ?? set.planned[field]]),
  ) as SetNumbers;
}

function updateSet(
  workout: ActiveWorkout,
  exerciseId: string,
  setId: string,
  change: (set: ActiveSet) => ActiveSet,
): ActiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map((set) => (set.id === setId ? change(set) : set)),
          }
        : exercise,
    ),
  };
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
// curl 1, face pull 2, curl 2…).
export function workoutOrder(workout: ActiveWorkout): OrderedSet[] {
  return workoutSegments(workout).flatMap(({ groupKey, exercises }) => {
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

export function countSets(workout: ActiveWorkout): { done: number; total: number } {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  return { done: sets.filter((set) => set.completedAt !== null).length, total: sets.length };
}

// What finish_workout() receives: only the sets that were done, and only
// the exercises that have some.
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
        change: null,
        swapped_from_id: null,
        change_reason: null,
        notes: null,
        sets: exercise.sets
          .filter((set) => set.completedAt !== null)
          .map((set) => {
            const numbers = shownNumbers(set);
            return {
              id: set.id,
              set_type: 'normal',
              weight_kg: numbers.weightKg,
              reps: numbers.reps,
              duration_s: numbers.durationS,
              distance_m: numbers.distanceM,
              speed_kmh: numbers.speedKmh,
              incline_pct: numbers.inclinePct,
              level: numbers.level,
              rpe: null,
              completed_at: set.completedAt,
            };
          }),
      }))
      .filter((exercise) => exercise.sets.length > 0),
  };
}
