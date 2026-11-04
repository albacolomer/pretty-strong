import {
  changeOver,
  formatSigned,
  inRange,
  latestMeasurements,
  measurementDays,
  measurementHistory,
  parseMeasurementKey,
  rangeStart,
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
    expect(inRange(weights, '3m', today).map((item) => item.date)).toEqual([
      '2026-08-01',
      '2026-10-10',
      '2026-10-24',
    ]);
    expect(inRange(weights, '1y', today)).toHaveLength(4);
  });

  test('the change over the range; none with fewer than two', () => {
    const kg = (range: '1m' | '3m') => inRange(weights, range, today).map((item) => item.weightKg);
    expect(changeOver(kg('3m'))).toBe(-1.5);
    expect(changeOver(kg('1m'))).toBe(-0.4);
    expect(changeOver([61.4])).toBeNull();
  });

  test('a change with its sign', () => {
    expect(formatSigned(-1.5, 'ca', 1)).toBe('−1,5');
    expect(formatSigned(0.5, 'en', 1)).toBe('+0.5');
    expect(formatSigned(0, 'ca', 1)).toBe('0,0');
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

  test('one measurement every time it was taken, newest first', () => {
    expect(measurementHistory(measurements, 'hips').map((item) => item.date)).toEqual([
      '2026-10-02',
      '2026-09-02',
    ]);
    expect(measurementHistory(measurements, 'custom:Bíceps')).toEqual([
      measured('2026-10-02', null, 31, 'Bíceps'),
    ]);
    expect(measurementHistory(measurements, 'chest')).toEqual([]);
  });

  test('what a key stands for', () => {
    expect(parseMeasurementKey('waist')).toEqual({ part: 'waist', customName: null });
    expect(parseMeasurementKey('custom:Bíceps')).toEqual({ part: null, customName: 'Bíceps' });
  });

  test('when they were last measured, and the time before', () => {
    expect(measurementDays(measurements)).toEqual({ latest: '2026-10-02', previous: '2026-09-02' });
    expect(measurementDays([])).toEqual({ latest: null, previous: null });
  });
});
