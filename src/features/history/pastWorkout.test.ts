import { NO_TARGETS } from '@/features/routines/routine';
import { cardioExercise, testExercise } from '@/features/routines/testData';

import {
  formatSetNumbers,
  pastBeats,
  pastTotals,
  toSavePayload,
  type PastExercise,
  type PastWorkout,
} from './pastWorkout';

const labels = { reps: (count: number) => `${count} reps`, level: 'Nivell' };
const numbers = (values: Partial<typeof NO_TARGETS>) => ({ ...NO_TARGETS, ...values });

function exercise(id: string, sets: Partial<typeof NO_TARGETS>[], extra: Partial<PastExercise> = {}): PastExercise {
  return {
    id: `se-${id}`,
    exerciseId: id,
    exercise: testExercise(id, id),
    replaced: null,
    routineExerciseId: null,
    groupKey: null,
    restS: 90,
    change: null,
    changeReason: null,
    notes: null,
    sets: sets.map((values, index) => ({
      id: `${id}-set-${index}`,
      setType: 'normal',
      numbers: numbers(values),
      rpe: null,
      completedAt: '2026-10-20T17:30:00.000Z',
    })),
    ...extra,
  };
}

const workout: PastWorkout = {
  id: 'session-1',
  date: '2026-10-20',
  plannedRoutineId: 'routine-1',
  routineId: 'routine-1',
  routineName: 'Tren superior 1',
  changeReason: null,
  logMode: 'live',
  startedAt: '2026-10-20T17:00:00.000Z',
  endedAt: '2026-10-20T18:05:00.000Z',
  durationS: null,
  energy: 4,
  notes: 'Molt bé',
  plannedSportId: null,
  sport: null,
  sportName: null,
  exercises: [
    exercise('lat', [{ weightKg: 40, reps: 10 }, { weightKg: 42.5, reps: 8 }]),
    exercise('row', [], { change: 'skipped', changeReason: 'machine_busy' }),
    {
      ...exercise('stairs', [{ durationS: 600, distanceM: 900 }]),
      exercise: cardioExercise('stairs', 'Escala'),
    },
  ],
};

describe('pastTotals', () => {
  test('duration from its times, exercises and sets done, kg and distance', () => {
    expect(pastTotals(workout)).toEqual({
      durationS: 65 * 60,
      exercises: 2,
      sets: 3,
      volumeKg: 740,
      distanceM: 900,
    });
  });

  test('a quick log has the duration typed in', () => {
    expect(pastTotals({ ...workout, logMode: 'quick', startedAt: null, endedAt: null, durationS: 3000, exercises: [] }))
      .toMatchObject({ durationS: 3000, exercises: 0, sets: 0 });
  });
});

describe('pastBeats', () => {
  const sets = (...values: Partial<typeof NO_TARGETS>[]) => values.map(numbers);

  test('counts the exercises that beat last time', () => {
    const lastTime = {
      // Heavier today: 42.5 kg against 40.
      lat: { routine: [], any: sets({ weightKg: 40, reps: 10 }) },
      // Skipped today: never counts.
      row: { routine: [], any: sets({ weightKg: 30, reps: 10 }) },
      // Cardio machines aren't compared.
      stairs: { routine: [], any: sets({ durationS: 600, distanceM: 800 }) },
    };
    expect(pastBeats(workout, lastTime, 'strength')).toBe(1);
  });

  test('last time in this routine comes first, row by row', () => {
    const today = {
      ...workout,
      exercises: [exercise('lat', [{ weightKg: 42.5, reps: 8 }], { routineExerciseId: 're-1' })],
    };
    const lastTime = {
      lat: {
        // In this routine: 45 kg, so today is down…
        routine: [{ routineExerciseId: 're-1', sets: sets({ weightKg: 45, reps: 6 }) }],
        // …even if it beats another routine's 40 kg.
        any: sets({ weightKg: 40, reps: 10 }),
      },
    };
    expect(pastBeats(today, lastTime, 'strength')).toBe(0);
  });

  test("a run routine's block only against itself, and nothing the first time", () => {
    const run = (routineExerciseId: string | null) => ({
      ...exercise('run', [{ distanceM: 400, durationS: 90 }], { routineExerciseId }),
      exercise: { ...testExercise('run', 'Córrer'), trackingType: 'run' as const },
    });
    // Faster than a 10 km run somewhere else, but that says nothing.
    const lastTime = { run: { routine: [], any: sets({ distanceM: 10000, durationS: 3600 }) } };
    expect(pastBeats({ ...workout, exercises: [run('re-1')] }, lastTime, 'run')).toBe(0);
    // Added that day (no routine row): compared with anywhere.
    expect(pastBeats({ ...workout, exercises: [run(null)] }, lastTime, 'run')).toBe(1);
    expect(pastBeats(workout, {}, 'strength')).toBe(0);
  });
});

describe('formatSetNumbers', () => {
  test('one line per tracking type, with only the numbers it has', () => {
    expect(formatSetNumbers('weight_reps', numbers({ weightKg: 42.5, reps: 8 }), 'ca', labels)).toBe('42,5 kg × 8');
    expect(formatSetNumbers('bodyweight_reps', numbers({ reps: 12 }), 'ca', labels)).toBe('12 reps');
    expect(formatSetNumbers('bodyweight_reps', numbers({ weightKg: 5, reps: 10 }), 'en', labels)).toBe('+5 kg · 10 reps');
    expect(formatSetNumbers('duration', numbers({ durationS: 75 }), 'ca', labels)).toBe('1:15');
    expect(formatSetNumbers('weight_distance', numbers({ weightKg: 24, distanceM: 40 }), 'ca', labels)).toBe('24 kg · 40 m');
    expect(
      formatSetNumbers('cardio_machine', numbers({ durationS: 600, speedKmh: 5.5, inclinePct: 12, level: 8 }), 'ca', labels),
    ).toBe('10:00 · 5,5 km/h · 12 % · Nivell 8');
    expect(formatSetNumbers('run', numbers({ distanceM: 5000, durationS: 1650 }), 'ca', labels)).toBe(
      '5 km · 27:30 · 5:30 /km',
    );
  });
});

describe('toSavePayload', () => {
  test('the whole workout as finish_workout() takes it, with the same ids', () => {
    const payload = toSavePayload({
      ...workout,
      exercises: [exercise('lat', [{ weightKg: 40, reps: 10 }], { replaced: testExercise('pulldown', 'x'), change: 'swapped' })],
    });

    expect(payload).toMatchObject({
      id: 'session-1',
      log_mode: 'live',
      duration_s: null,
      energy: 4,
      notes: 'Molt bé',
    });
    expect(payload.exercises[0]).toMatchObject({ id: 'se-lat', change: 'swapped', swapped_from_id: 'pulldown' });
    expect(payload.exercises[0].sets[0]).toMatchObject({
      id: 'lat-set-0',
      weight_kg: 40,
      reps: 10,
      completed_at: '2026-10-20T17:30:00.000Z',
    });
  });
});
