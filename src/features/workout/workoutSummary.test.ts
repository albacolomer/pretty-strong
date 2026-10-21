import { NO_TARGETS, type Routine } from '@/features/routines/routine';
import { sundayRun, upperBody } from '@/features/routines/testData';

import {
  skipExercise,
  toggleSet,
  updateTyped,
  workoutFromRoutine,
  type ActiveWorkout,
} from './activeWorkout';
import { summarize } from './workoutSummary';

const lift = (weightKg: number, reps: number) => ({ ...NO_TARGETS, weightKg, reps });

// Tracció al pit 2 × 10 at 40 kg; Rem assegut 2 × 12 at 30 kg; Face pull, no plan.
const routine: Routine = {
  ...upperBody,
  exercises: [
    { ...upperBody.exercises[0], sets: [lift(40, 10), lift(40, 10)] },
    { ...upperBody.exercises[1], sets: [lift(30, 12), lift(30, 12)] },
    { ...upperBody.exercises[2], sets: [NO_TARGETS] },
  ],
};

let ids = 0;
function start(): ActiveWorkout {
  return workoutFromRoutine(routine, {
    date: '2026-10-20',
    plannedRoutineId: 'routine-1',
    changeReason: null,
    startedAt: '2026-10-20T17:00:00.000Z',
    newId: () => `id-${(ids += 1)}`,
    defaultRestS: () => 90,
  });
}

function tickAll(workout: ActiveWorkout, exerciseIndex: number): ActiveWorkout {
  const exercise = workout.exercises[exerciseIndex];
  return exercise.sets.reduce(
    (current, set) => toggleSet(current, exercise.id, set.id, '2026-10-20T17:30:00.000Z'),
    workout,
  );
}

describe('summarize', () => {
  test('counts the duration, exercises and sets done, and the kg lifted', () => {
    let workout = tickAll(start(), 0);
    const row = workout.exercises[1];
    workout = toggleSet(workout, row.id, row.sets[0].id, '2026-10-20T17:40:00.000Z');

    const summary = summarize(workout, '2026-10-20T17:58:00.000Z');

    expect(summary).toMatchObject({
      durationS: 58 * 60,
      exercises: 2,
      sets: 3,
      // 2 × 10 × 40 + 12 × 30
      volumeKg: 1160,
      highlights: [],
    });
  });

  test('highlights the exercises that beat last time', () => {
    let workout = start();
    workout = {
      ...workout,
      exercises: workout.exercises.map((exercise, index) => ({
        ...exercise,
        previous: index === 0 ? [lift(40, 10)] : index === 1 ? [lift(32.5, 12)] : null,
      })),
    };
    const lat = workout.exercises[0];
    workout = updateTyped(workout, lat.id, lat.sets[0].id, () => lift(42.5, 10));
    workout = tickAll(tickAll(workout, 0), 1);

    const { highlights } = summarize(workout, '2026-10-20T18:00:00.000Z');

    // Tracció al pit went up; Rem assegut went down, so it isn't one.
    expect(highlights.map((item) => [item.exercise.exerciseId, item.comparison])).toEqual([
      ['exercise-1', { direction: 'up', change: { unit: 'kg', amount: 2.5 } }],
    ]);
  });

  test('adds up the distance of runs and cardio machines', () => {
    const runRoutine: Routine = {
      ...sundayRun,
      exercises: sundayRun.exercises.map((item) => ({
        ...item,
        sets: item.sets.map((set) => ({ ...set, durationS: 300 })),
      })),
    };
    let workout = workoutFromRoutine(runRoutine, {
      date: '2026-10-25',
      plannedRoutineId: null,
      changeReason: null,
      startedAt: '2026-10-25T09:00:00.000Z',
      newId: () => `id-${(ids += 1)}`,
      defaultRestS: () => 90,
    });
    workout = tickAll(tickAll(workout, 0), 1);

    expect(summarize(workout, '2026-10-25T09:30:00.000Z')).toMatchObject({
      distanceM: 1800,
      volumeKg: 0,
    });
  });

  test('skipped exercises and sets without ✓ don’t count', () => {
    let workout = start();
    workout = skipExercise(workout, workout.exercises[1].id, { reason: null });

    expect(summarize(workout, '2026-10-20T17:10:00.000Z')).toMatchObject({
      exercises: 0,
      sets: 0,
      volumeKg: 0,
    });
  });
});
