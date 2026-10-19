import { NO_TARGETS, type Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';

import {
  countSets,
  shownNumbers,
  toFinishPayload,
  toggleSet,
  updateTyped,
  workoutFromRoutine,
  type ActiveWorkout,
} from './activeWorkout';

// Tracció al pit planned as 2 × 10 at 40 kg; the others with no plan.
const routine: Routine = {
  ...upperBody,
  exercises: upperBody.exercises.map((item, index) =>
    index === 0
      ? { ...item, restS: 120, notes: 'Agafada ampla', sets: Array(2).fill({ ...NO_TARGETS, reps: 10, weightKg: 40 }) }
      : item,
  ),
};

let ids = 0;
const start = (): ActiveWorkout =>
  workoutFromRoutine(routine, {
    date: '2026-10-20',
    plannedRoutineId: 'routine-1',
    changeReason: null,
    startedAt: '2026-10-20T17:00:00.000Z',
    newId: () => `id-${(ids += 1)}`,
  });

describe('workoutFromRoutine', () => {
  test('copies the routine: its exercises in order, one set per planned set, pre-filled', () => {
    const workout = start();

    expect(workout).toMatchObject({
      date: '2026-10-20',
      plannedRoutineId: 'routine-1',
      routineId: 'routine-1',
      routineName: 'Tren superior 1',
    });
    expect(workout.exercises.map((e) => [e.exercise.names?.ca, e.routineExerciseId, e.sets.length])).toEqual([
      ['Tracció al pit', 're-1', 2],
      ['Rem assegut amb politja', 're-2', 3],
      ['Face pull', 're-3', 3],
      ['Curl martell', 're-4', 3],
    ]);
    expect(workout.exercises[0]).toMatchObject({ restS: 120, notes: 'Agafada ampla' });
    expect(workout.exercises[0].sets[0]).toMatchObject({
      planned: { reps: 10, weightKg: 40 },
      completedAt: null,
    });
    // Every id is its own.
    const allIds = [workout.id, ...workout.exercises.flatMap((e) => [e.id, ...e.sets.map((s) => s.id)])];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe('logging sets', () => {
  test('shows what was typed, else the plan', () => {
    let workout = start();
    const [exercise] = workout.exercises;
    workout = updateTyped(workout, exercise.id, exercise.sets[0].id, (typed) => ({ ...typed, weightKg: 42.5 }));

    expect(shownNumbers(workout.exercises[0].sets[0])).toMatchObject({ reps: 10, weightKg: 42.5 });
  });

  test('✓ logs the set as shown, with the time; tapped again, it isn’t done', () => {
    let workout = start();
    const [exercise] = workout.exercises;
    const setId = exercise.sets[0].id;

    workout = toggleSet(workout, exercise.id, setId, '2026-10-20T17:05:00.000Z');
    expect(workout.exercises[0].sets[0]).toMatchObject({
      typed: { reps: 10, weightKg: 40 },
      completedAt: '2026-10-20T17:05:00.000Z',
    });
    expect(countSets(workout)).toEqual({ done: 1, total: 11 });

    workout = toggleSet(workout, exercise.id, setId, '2026-10-20T17:06:00.000Z');
    expect(workout.exercises[0].sets[0].completedAt).toBeNull();
  });
});

describe('toFinishPayload', () => {
  test('sends only the sets done, and only the exercises that have some', () => {
    let workout = start();
    const [lat, row] = workout.exercises;
    workout = toggleSet(workout, lat.id, lat.sets[0].id, '2026-10-20T17:05:00.000Z');
    workout = updateTyped(workout, row.id, row.sets[1].id, (typed) => ({ ...typed, reps: 12, weightKg: 30 }));
    workout = toggleSet(workout, row.id, row.sets[1].id, '2026-10-20T17:10:00.000Z');

    const payload = toFinishPayload({ ...workout, endedAt: '2026-10-20T18:00:00.000Z' });

    expect(payload).toMatchObject({
      id: workout.id,
      date: '2026-10-20',
      planned_routine_id: 'routine-1',
      routine_id: 'routine-1',
      started_at: '2026-10-20T17:00:00.000Z',
      ended_at: '2026-10-20T18:00:00.000Z',
    });
    expect(payload.exercises.map((e) => [e.routine_exercise_id, e.sets.length])).toEqual([
      ['re-1', 1],
      ['re-2', 1],
    ]);
    expect(payload.exercises[0].sets[0]).toMatchObject({
      weight_kg: 40,
      reps: 10,
      set_type: 'normal',
      completed_at: '2026-10-20T17:05:00.000Z',
    });
    expect(payload.exercises[1].sets[0]).toMatchObject({ weight_kg: 30, reps: 12 });
  });
});
