import type { Exercise } from '@/features/exercises/exercise';
import { NO_TARGETS, type ExerciseTargets, type Routine } from '@/features/routines/routine';

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
  // Null: the exercise's own default rest.
  restS: number | null;
  // The routine's note on it, shown during the workout.
  notes: string | null;
  sets: ActiveSet[];
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
};

// Finished, waiting to be saved to the database.
export type FinishedWorkout = ActiveWorkout & { endedAt: string };

type StartOptions = {
  date: string;
  plannedRoutineId: string | null;
  changeReason: ChangeReason | null;
  startedAt: string;
  newId: () => string;
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
    exercises: routine.exercises.map((item) => ({
      id: options.newId(),
      exerciseId: item.exerciseId,
      exercise: item.exercise,
      routineExerciseId: item.id,
      groupKey: item.groupKey,
      restS: item.restS,
      notes: item.notes,
      sets: item.sets.map((planned) => ({
        id: options.newId(),
        planned,
        typed: NO_TARGETS,
        completedAt: null,
      })),
    })),
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
