import {
  latestMeasurements,
  measurementDays,
  rangeStart,
  weightChange,
  weightsInRange,
  type BodyMeasurement,
} from './body';

const today = new Date(2026, 9, 24);
const weight = (date: string, weightKg: number) => ({ id: date, date, weightKg });

describe('body weight', () => {
  const weights = [
    weight('2026-10-24', 61.4),
    weight('2026-07-20', 63.5),
    weight('2026-08-01', 62.9),
    weight('2026-10-10', 61.8),
  ];

  test('the range, oldest first', () => {
    expect(rangeStart('3m', today)).toBe('2026-07-25');
    expect(weightsInRange(weights, '3m', today).map((item) => item.date)).toEqual([
      '2026-08-01',
      '2026-10-10',
      '2026-10-24',
    ]);
    expect(weightsInRange(weights, '1y', today)).toHaveLength(4);
  });

  test('the change over the range; none with fewer than two', () => {
    expect(weightChange(weightsInRange(weights, '3m', today))).toBe(-1.5);
    expect(weightChange(weightsInRange(weights, '1m', today))).toBe(-0.4);
    expect(weightChange([weight('2026-10-24', 61.4)])).toBeNull();
  });
});

describe('measurements', () => {
  const measured = (
    date: string,
    part: BodyMeasurement['part'],
    valueCm: number,
    customName: string | null = null,
  ): BodyMeasurement => ({ date, part, customName, valueCm });

  const measurements = [
    measured('2026-09-02', 'waist', 69),
    measured('2026-10-02', 'waist', 68),
    measured('2026-10-02', 'hips', 96.5),
    measured('2026-09-02', 'hips', 96),
    measured('2026-10-02', null, 31, 'Bíceps'),
  ];

  test('the usual five first, measured or not, then your own; each with its change', () => {
    expect(
      latestMeasurements(measurements).map((item) => [item.key, item.valueCm, item.changeCm]),
    ).toEqual([
      ['waist', 68, -1],
      ['hips', 96.5, 0.5],
      ['chest', null, null],
      ['arm', null, null],
      ['thigh', null, null],
      ['custom:Bíceps', 31, null],
    ]);
  });

  test('when they were last measured, and the time before', () => {
    expect(measurementDays(measurements)).toEqual({ latest: '2026-10-02', previous: '2026-09-02' });
    expect(measurementDays([])).toEqual({ latest: null, previous: null });
  });
});
