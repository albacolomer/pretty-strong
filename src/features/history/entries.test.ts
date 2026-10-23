import {
  entryDetails,
  formatShortDate,
  streakTarget,
  streakWeeks,
  weeklyCounts,
  weeklyGoal,
  type HistoryEntry,
} from './entries';

const labels = {
  stations: (count: number) => `${count} estacions`,
  sets: (count: number) => `${count} sèries`,
  quick: 'Registre ràpid',
};

function entry(values: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'session-1',
    date: '2026-10-21',
    routineName: 'Tren inferior 1',
    routineLabel: 'strength',
    customLabel: null,
    logMode: 'live',
    durationS: 5520,
    exercises: 5,
    sets: 18,
    volumeKg: 7240,
    distanceM: 0,
    runDistanceM: 0,
    pace: null,
    pending: false,
    ...values,
  };
}

// Workouts on these days (Mondays: 28 Sep, 5, 12 and 19 Oct 2026).
const days = (...dates: string[]) => weeklyCounts(dates.map((date) => ({ date })));

describe('weekly numbers', () => {
  test('workouts per week, by its Monday', () => {
    expect(days('2026-10-19', '2026-10-21', '2026-10-25', '2026-10-12')).toEqual(
      new Map([
        ['2026-10-19', 3],
        ['2026-10-12', 1],
      ]),
    );
  });

  test('a week keeps the streak at 75% of the goal, rounded', () => {
    expect([1, 2, 3, 4, 5, 6].map(streakTarget)).toEqual([1, 2, 2, 3, 4, 5]);
    expect(streakTarget(null)).toBe(1);
  });

  test('the streak counts kept weeks in a row; this week only adds once kept', () => {
    const wednesday = new Date(2026, 9, 21);
    // Goal 4 → 3 a week. 5 Oct had 3, 12 Oct had 3, 28 Sep only 2.
    const counts = days(
      '2026-09-28', '2026-09-30',
      '2026-10-05', '2026-10-06', '2026-10-08',
      '2026-10-12', '2026-10-14', '2026-10-16',
      '2026-10-19',
    );
    // This week has 1 so far: not kept yet, but not broken either.
    expect(streakWeeks(counts, 4, wednesday)).toBe(2);
    counts.set('2026-10-19', 3);
    expect(streakWeeks(counts, 4, wednesday)).toBe(3);
    // A week with nothing ends it.
    expect(streakWeeks(days('2026-10-05'), 4, wednesday)).toBe(0);
  });

  test('the goal: your own, else the days your routines are planned on', () => {
    const routines = [{ weekdays: [1, 3] }, { weekdays: [3, 5, 6] }];
    expect(weeklyGoal(null, routines)).toBe(4);
    expect(weeklyGoal(5, routines)).toBe(5);
    expect(weeklyGoal(null, [{ weekdays: [] }])).toBeNull();
  });
});

describe('a row', () => {
  test('strength: time and kg; without weights, the sets', () => {
    expect(entryDetails(entry({}), 'ca', labels)).toEqual(['1 h 32 min', '7.240 kg']);
    expect(entryDetails(entry({ volumeKg: 0 }), 'ca', labels)).toEqual(['1 h 32 min', '18 sèries']);
  });

  test('a run: distance and pace; hybrid: time and stations', () => {
    expect(
      entryDetails(entry({ routineLabel: 'run', distanceM: 10100, pace: 342 }), 'ca', labels),
    ).toEqual(['10,1 km', '5:42 /km']);
    expect(entryDetails(entry({ routineLabel: 'hybrid', exercises: 8 }), 'ca', labels)).toEqual([
      '1 h 32 min',
      '8 estacions',
    ]);
  });

  test('a quick log without sets says so', () => {
    expect(
      entryDetails(
        entry({ routineLabel: 'class', logMode: 'quick', durationS: 3000, sets: 0, volumeKg: 0 }),
        'ca',
        labels,
      ),
    ).toEqual(['50 min', 'Registre ràpid']);
  });

  test('its date, short', () => {
    expect(formatShortDate('2026-10-21', 'ca')).toBe('dc., 21 d’oct.');
    expect(formatShortDate('2026-10-21', 'en')).toBe('Wed, Oct 21');
  });
});
