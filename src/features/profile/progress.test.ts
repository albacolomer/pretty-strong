import type { HistoryEntry } from '@/features/history/entries';

import {
  formatKm,
  formatVolume,
  monthSoFar,
  periodTotals,
  trainingMix,
  weeklySeries,
} from './progress';

function entry(date: string, values: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: date,
    date,
    routineName: 'Tren superior 1',
    routineLabel: 'strength',
    customLabel: null,
    sport: null,
    sportName: null,
    logMode: 'live',
    durationS: 3600,
    exercises: 4,
    sets: 14,
    volumeKg: 5000,
    distanceM: 0,
    runDistanceM: 0,
    pace: null,
    pending: false,
    ...values,
  };
}

// Today is Wednesday 21 October 2026.
const today = new Date(2026, 9, 21);

describe('workouts per week', () => {
  test('the last six weeks, this one last and still going', () => {
    const series = weeklySeries(
      [entry('2026-10-21'), entry('2026-10-19'), entry('2026-10-14'), entry('2026-09-14')],
      today,
    );

    expect(series).toEqual([
      { weekStart: '2026-09-14', count: 1, current: false },
      { weekStart: '2026-09-21', count: 0, current: false },
      { weekStart: '2026-09-28', count: 0, current: false },
      { weekStart: '2026-10-05', count: 0, current: false },
      { weekStart: '2026-10-12', count: 1, current: false },
      { weekStart: '2026-10-19', count: 2, current: true },
    ]);
  });
});

describe('this month so far', () => {
  test('against the same days of last month', () => {
    const result = monthSoFar(
      [
        entry('2026-10-21', { durationS: 5400, volumeKg: 7000 }),
        entry('2026-10-02', { routineLabel: 'run', durationS: 3000, volumeKg: 0, runDistanceM: 10100 }),
        // Same days of September: 1st to 21st.
        entry('2026-09-21', { durationS: 3600, volumeKg: 6000 }),
        // After the 21st: not compared.
        entry('2026-09-25'),
      ],
      today,
    );

    expect(result.current).toEqual({
      workouts: 2,
      timeS: 8400,
      volumeKg: 7000,
      runDistanceM: 10100,
      averageS: 4200,
    });
    expect(result.previous).toMatchObject({ workouts: 1, timeS: 3600, volumeKg: 6000, averageS: 3600 });
    expect([result.previousFrom, result.previousTo]).toEqual(['2026-09-01', '2026-09-21']);
    expect(result.entries).toHaveLength(2);
  });

  test('on the 31st, last month stops at its own end', () => {
    expect(monthSoFar([], new Date(2026, 9, 31)).previousTo).toBe('2026-09-30');
    expect(monthSoFar([], new Date(2026, 2, 30)).previousTo).toBe('2026-02-28');
  });

  test('a walk or stretching is activity, not a workout', () => {
    const walk = entry('2026-10-20', {
      sport: 'walking',
      routineName: null,
      routineLabel: null,
      durationS: 1800,
      volumeKg: 0,
    });
    const result = monthSoFar([entry('2026-10-21'), walk], today);
    expect(result.current).toMatchObject({ workouts: 1, timeS: 3600, averageS: 3600 });
    // Still in the month's mix.
    expect(result.entries).toHaveLength(2);
    expect(weeklySeries([entry('2026-10-21'), walk], today).at(-1)?.count).toBe(1);
  });

  test('nothing yet: no average', () => {
    expect(periodTotals([])).toEqual({ workouts: 0, timeS: 0, volumeKg: 0, runDistanceM: 0, averageS: null });
  });
});

describe('training mix', () => {
  test('by routine type, most first; each custom type and sport on its own', () => {
    const mix = trainingMix([
      entry('2026-10-01'),
      entry('2026-10-02', { routineLabel: 'hybrid' }),
      entry('2026-10-03'),
      entry('2026-10-04', { routineLabel: 'custom', customLabel: 'Natació' }),
      entry('2026-10-05', { routineLabel: null, routineName: null }),
      entry('2026-10-06', { routineLabel: null, routineName: null, sport: 'padel' }),
      entry('2026-10-07', { routineLabel: null, routineName: null, sport: 'padel' }),
    ]);

    expect(mix.map((item) => [item.sport ?? item.customLabel ?? item.label, item.count])).toEqual([
      ['strength', 2],
      ['padel', 2],
      ['hybrid', 1],
      ['Natació', 1],
      [null, 1],
    ]);
  });
});

describe('formatting', () => {
  test('tonnes from a tonne up; km with one decimal', () => {
    expect(formatVolume(74800, 'ca')).toBe('74,8 t');
    expect(formatVolume(850, 'ca')).toBe('850 kg');
    expect(formatVolume(74800, 'en')).toBe('74.8 t');
    expect(formatKm(18300, 'ca')).toBe('18,3 km');
  });
});
