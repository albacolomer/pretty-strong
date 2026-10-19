import { NO_TARGETS, type Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';

import {
  afterSet,
  countSets,
  nextSet,
  shownNumbers,
  toFinishPayload,
  toggleSet,
  updateTyped,
  workoutFromRoutine,
  workoutOrder,
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
    defaultRestS: () => 90,
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

describe('rest and order', () => {
  // Lat pulldown on its own (2 sets, 2:00 rest), then face pull + curl as a
  // superset (2 rounds, 1:00 rest after each round).
  const superset: Routine = {
    ...upperBody,
    exercises: [
      { ...upperBody.exercises[0], restS: 120, sets: [NO_TARGETS, NO_TARGETS] },
      { ...upperBody.exercises[2], groupKey: 'g1', restS: 60, sets: [NO_TARGETS, NO_TARGETS] },
      { ...upperBody.exercises[3], groupKey: 'g1', restS: 60, sets: [NO_TARGETS, NO_TARGETS] },
    ],
  };
  const begin = () =>
    workoutFromRoutine(superset, {
      date: '2026-10-20',
      plannedRoutineId: null,
      changeReason: null,
      startedAt: '2026-10-20T17:00:00.000Z',
      newId: () => `id-${(ids += 1)}`,
      defaultRestS: () => 90,
    });
  const tick = (workout: ActiveWorkout, exerciseIndex: number, setIndex: number) => {
    const exercise = workout.exercises[exerciseIndex];
    return toggleSet(workout, exercise.id, exercise.sets[setIndex].id, '2026-10-20T17:05:00.000Z');
  };
  const setOf = (workout: ActiveWorkout, exerciseIndex: number, setIndex: number) =>
    workout.exercises[exerciseIndex].sets[setIndex].id;

  test('fixes each exercise’s rest when it starts: the routine’s, else the default', () => {
    const plain = workoutFromRoutine(upperBody, {
      date: '2026-10-20',
      plannedRoutineId: null,
      changeReason: null,
      startedAt: '2026-10-20T17:00:00.000Z',
      newId: () => `id-${(ids += 1)}`,
      defaultRestS: (exerciseId) => (exerciseId === 'exercise-2' ? 150 : 90),
    });
    expect(plain.exercises.map((e) => e.restS)).toEqual([90, 150, 90, 90]);
    expect(plain.rest).toBeNull();
  });

  test('goes through a superset round by round', () => {
    const workout = begin();
    const [lat, face, curl] = workout.exercises.map((e) => e.id);

    expect(workoutOrder(workout).map((item) => [item.exerciseId, item.round])).toEqual([
      [lat, 0],
      [lat, 1],
      [face, 0],
      [curl, 0],
      [face, 1],
      [curl, 1],
    ]);
  });

  test('rests after a set on its own; in a superset only at the end of the round', () => {
    let workout = begin();

    workout = tick(workout, 0, 0);
    expect(afterSet(workout, setOf(workout, 0, 0))).toEqual({
      restS: 120,
      next: { exerciseId: workout.exercises[0].id, setId: setOf(workout, 0, 1) },
    });

    // Face pull, round 1: straight on to the curl, no rest.
    workout = tick(workout, 1, 0);
    expect(afterSet(workout, setOf(workout, 1, 0))).toEqual({
      restS: null,
      next: { exerciseId: workout.exercises[2].id, setId: setOf(workout, 2, 0) },
    });

    // Curl, end of round 1: rest, then face pull round 2.
    workout = tick(workout, 2, 0);
    expect(afterSet(workout, setOf(workout, 2, 0))).toEqual({
      restS: 60,
      next: { exerciseId: workout.exercises[1].id, setId: setOf(workout, 1, 1) },
    });
  });

  test('the next set is the first not done; none (and no rest) once all are done', () => {
    let workout = begin();
    expect(nextSet(workout)?.setId).toBe(setOf(workout, 0, 0));

    // Skipping ahead leaves the earlier set as the one after the last.
    workout = tick(workout, 2, 1);
    expect(nextSet(workout, setOf(workout, 2, 1))?.setId).toBe(setOf(workout, 0, 0));

    for (const [e, s] of [[0, 0], [0, 1], [1, 0], [2, 0], [1, 1]]) workout = tick(workout, e, s);
    expect(nextSet(workout)).toBeNull();
    expect(afterSet(workout, setOf(workout, 1, 1))).toEqual({ restS: null, next: null });
  });
});
