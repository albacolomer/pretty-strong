import { NO_TARGETS } from '@/features/routines/routine';

import { compareToLastTime } from './compareToLastTime';

const lift = (weightKg: number | null, reps: number | null) => ({ ...NO_TARGETS, weightKg, reps });

describe('compareToLastTime', () => {
  test('weights: a heavier top set is up, by the difference', () => {
    expect(
      compareToLastTime('weight_reps', [lift(42.5, 8), lift(40, 10)], [lift(40, 10), lift(40, 9)]),
    ).toEqual({ direction: 'up', change: { unit: 'kg', amount: 2.5 } });
  });

  test('weights: the same weight compares the reps at it', () => {
    expect(compareToLastTime('weight_reps', [lift(40, 11)], [lift(40, 10)])).toEqual({
      direction: 'up',
      change: { unit: 'reps', amount: 1 },
    });
    expect(compareToLastTime('weight_reps', [lift(40, 10)], [lift(40, 10)])).toEqual({
      direction: 'same',
      change: null,
    });
    expect(compareToLastTime('weight_reps', [lift(37.5, 12)], [lift(40, 8)])).toEqual({
      direction: 'down',
      change: { unit: 'kg', amount: -2.5 },
    });
  });

  test('bodyweight: the most reps, or the added weight when there is some', () => {
    expect(compareToLastTime('bodyweight_reps', [lift(null, 15)], [lift(null, 12)])).toEqual({
      direction: 'up',
      change: { unit: 'reps', amount: 3 },
    });
    expect(compareToLastTime('bodyweight_reps', [lift(5, 10)], [lift(null, 12)])).toEqual({
      direction: 'up',
      change: { unit: 'kg', amount: 5 },
    });
  });

  test('holds compare the longest; carries the weight, then the distance', () => {
    const hold = (durationS: number) => ({ ...NO_TARGETS, durationS });
    expect(compareToLastTime('duration', [hold(60), hold(45)], [hold(50)])).toEqual({
      direction: 'up',
      change: { unit: 's', amount: 10 },
    });
    const carry = (weightKg: number, distanceM: number) => ({ ...NO_TARGETS, weightKg, distanceM });
    expect(compareToLastTime('weight_distance', [carry(24, 40)], [carry(24, 30)])).toEqual({
      direction: 'up',
      change: { unit: 'm', amount: 10 },
    });
  });

  test('runs: a faster average pace is up, by how much faster per km', () => {
    const run = (distanceM: number | null, durationS: number | null) => ({ ...NO_TARGETS, distanceM, durationS });
    // 5 km in 27:30 (5:30 /km) vs 5:40 /km last time.
    expect(compareToLastTime('run', [run(5000, 1650)], [run(5000, 1700)])).toEqual({
      direction: 'up',
      change: { unit: 's/km', amount: -10 },
    });
    // 2 × 400 m in 1:36 (4:00 /km) vs 3:45 /km.
    expect(compareToLastTime('run', [run(400, 96), run(400, 96)], [run(400, 90)])).toEqual({
      direction: 'down',
      change: { unit: 's/km', amount: 15 },
    });
    expect(compareToLastTime('run', [run(1000, 330)], [run(2000, 660)])).toEqual({
      direction: 'same',
      change: null,
    });
    // No time, no pace.
    expect(compareToLastTime('run', [run(5000, null)], [run(5000, 1700)])).toBeNull();
  });

  test('nothing to compare without numbers on both sides, nor for cardio machines', () => {
    expect(compareToLastTime('weight_reps', [lift(40, 10)], [])).toBeNull();
    expect(compareToLastTime('weight_reps', [], [lift(40, 10)])).toBeNull();
    expect(compareToLastTime('run', [{ ...NO_TARGETS, distanceM: 5000 }], [])).toBeNull();
    const segment = { ...NO_TARGETS, durationS: 600, level: 8 };
    expect(compareToLastTime('cardio_machine', [segment], [segment])).toBeNull();
  });
});
