import { NO_TARGETS, type Routine } from '@/features/routines/routine';
import { cardioExercise, sundayRun, upperBody } from '@/features/routines/testData';

import {
  afterSet,
  applyLastTime,
  showAllFields,
  toggleSet,
  workoutFromRoutine,
  type ActiveWorkout,
} from './activeWorkout';
import { formatPace, pace, workoutInputs } from './cardio';

const run = (distanceM: number | null, durationS: number | null) => ({
  ...NO_TARGETS,
  distanceM,
  durationS,
});

let ids = 0;
function start(routine: Routine): ActiveWorkout {
  return workoutFromRoutine(routine, {
    date: '2026-10-25',
    plannedRoutineId: routine.id,
    changeReason: null,
    startedAt: '2026-10-25T09:00:00.000Z',
    newId: () => `id-${(ids += 1)}`,
    defaultRestS: () => 90,
  });
}

// Stairmaster: 2 segments of 5 min, the second at level 10.
const finisher: Routine = {
  ...upperBody,
  exercises: [
    {
      ...upperBody.exercises[0],
      id: 're-stairs',
      exerciseId: 'stairs',
      exercise: cardioExercise('stairs', 'Escala'),
      restS: 60,
      sets: [
        { ...NO_TARGETS, durationS: 300 },
        { ...NO_TARGETS, durationS: 300, level: 10 },
      ],
    },
  ],
};

describe('pace', () => {
  test('total time over total distance, in seconds per km', () => {
    expect(pace([run(5000, 27 * 60 + 30)])).toBe(330);
    // 2 × 400 m in 1:30: 3:45 /km. A set without both doesn't count.
    expect(pace([run(400, 90), run(400, 90), run(null, 60)])).toBe(225);
    expect(pace([run(5000, null)])).toBeNull();
    expect(pace([])).toBeNull();
  });

  test('reads as minutes and seconds per km', () => {
    expect(formatPace(330)).toBe('5:30 /km');
    expect(formatPace(225)).toBe('3:45 /km');
  });
});

describe('run blocks (US-19)', () => {
  test('know what they are; intervals in metres, the rest in km, both with time', () => {
    const [warmUp, intervals] = start(sundayRun).exercises;

    expect(warmUp.runBlock?.kind).toBe('distance');
    expect(intervals.runBlock).toEqual({ kind: 'intervals', plan: sundayRun.exercises[1].sets });
    expect(workoutInputs(warmUp)).toEqual(['distanceKm', 'minutes', 'seconds']);
    expect(workoutInputs(intervals)).toEqual(['distanceM', 'minutes', 'seconds']);
  });

  test('intervals rest for their recovery; other blocks go straight on', () => {
    const workout = start(sundayRun);
    const [warmUp, intervals] = workout.exercises;

    expect([warmUp.restS, intervals.restS]).toEqual([0, 90]);
    expect(afterSet(workout, warmUp.sets[0].id).restS).toBeNull();
    expect(afterSet(workout, intervals.sets[0].id).restS).toBe(90);
  });

  test('a run in another kind of routine is a plain exercise', () => {
    const hybrid = { ...sundayRun, label: 'hybrid' as const };
    const [warmUp] = start(hybrid).exercises;

    expect(warmUp.runBlock).toBeNull();
    expect(warmUp.restS).toBe(90);
  });

  test('each block gets its own last time, and is only compared with itself', () => {
    const workout = applyLastTime(start(sundayRun), {
      run: {
        routine: [
          { routineExerciseId: 're-warmup', sets: [run(1000, 330)] },
          { routineExerciseId: 're-intervals', sets: [run(400, 95), run(400, 92)] },
        ],
        any: [run(10000, 3300)],
      },
    });
    const [warmUp, intervals] = workout.exercises;

    expect(warmUp.sets[0].planned).toEqual(run(1000, 330));
    expect(intervals.sets.map((set) => set.planned)).toEqual([run(400, 95), run(400, 92)]);

    // A new block (no row last time): its plan, and nothing to compare.
    const fresh = applyLastTime(start(sundayRun), {
      run: { routine: [{ routineExerciseId: 're-warmup', sets: [run(1000, 330)] }], any: [run(10000, 3300)] },
    });
    expect(fresh.exercises[1].sets[0].planned).toEqual(run(400, null));
    expect(fresh.exercises[1].previous).toBeNull();
  });
});

describe('cardio machines (US-19)', () => {
  test('segments run on, one into the next; rest after the last', () => {
    let workout = start(finisher);
    const [stairs] = workout.exercises;
    workout = toggleSet(workout, stairs.id, stairs.sets[0].id, '2026-10-25T09:05:00.000Z');

    expect(afterSet(workout, stairs.sets[0].id).restS).toBeNull();
    expect(afterSet(workout, stairs.sets[1].id).restS).toBe(60);
  });

  test('show the time and the fields in use, or all of them', () => {
    const [stairs] = start(finisher).exercises;
    expect(workoutInputs(stairs)).toEqual(['minutes', 'seconds', 'level']);

    // Last time also had speed and incline: those show too, in order.
    const previous = [{ ...NO_TARGETS, durationS: 600, speedKmh: 5, inclinePct: 12 }];
    expect(workoutInputs({ ...stairs, previous })).toEqual([
      'minutes',
      'seconds',
      'speedKmh',
      'inclinePct',
      'level',
    ]);

    // Nothing to go on: all six.
    const blank = { ...stairs, sets: stairs.sets.map((set) => ({ ...set, planned: NO_TARGETS })) };
    expect(workoutInputs(blank)).toHaveLength(6);

    // "Mostra tots els camps".
    const workout = start(finisher);
    const shown = showAllFields(workout, workout.exercises[0].id);
    expect(workoutInputs(shown.exercises[0])).toHaveLength(6);
  });
});
