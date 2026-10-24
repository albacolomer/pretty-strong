import { NO_TARGETS, routineDuration, type Routine } from '@/features/routines/routine';
import { sundayRun, upperBody } from '@/features/routines/testData';

import { formatTimeTyping, readTime, type WeeklySport } from './sports';
import { activitiesOnDay, nextDayPosition, weekSummary } from './week';

const sport = (values: Partial<WeeklySport>): WeeklySport => ({
  id: 'sport-1',
  weekday: 1,
  sport: 'padel',
  customName: null,
  startTime: '19:00',
  durationS: 5400,
  position: 1,
  ...values,
});

describe('sports in the week', () => {
  // Tren superior 1 on Monday (first) and Thursday; padel on Monday after it.
  const routines: Routine[] = [{ ...upperBody, weekdays: [1, 4], dayPositions: { 1: 0, 4: 0 } }];

  test('a day has its routines and sports together, in order', () => {
    const padel = sport({});
    const basket = sport({ id: 'sport-2', sport: 'basketball', position: 0 });
    expect(activitiesOnDay(routines, [padel, basket], 1).map((activity) => activity.key)).toEqual([
      // Same position as the routine: the routine first.
      'routine:routine-1',
      'sport:sport-2',
      'sport:sport-1',
    ]);
    expect(nextDayPosition(routines, [padel], 1)).toBe(2);
    expect(nextDayPosition(routines, [padel], 3)).toBe(0);
  });

  test('the week: workouts, sports, and days with neither', () => {
    expect(weekSummary(routines, [sport({}), sport({ id: 'sport-2', weekday: 6 })])).toEqual({
      workouts: 2,
      sports: 2,
      restDays: 4,
    });
  });

  test('a time typed on the number keypad', () => {
    expect(formatTimeTyping('193')).toBe('19:3');
    expect(formatTimeTyping('19:30')).toBe('19:30');
    expect(readTime('1930')).toBe('19:30');
    expect(readTime('7')).toBe('07:00');
    expect(readTime('730')).toBe('07:30');
    expect(readTime('2560')).toBeNull();
    expect(readTime('')).toBeNull();
  });
});

describe('how long a routine takes', () => {
  test('its planned duration, when it has one', () => {
    expect(routineDuration({ ...upperBody, plannedDurationS: 3600 }, 90)).toEqual({
      seconds: 3600,
      estimated: false,
    });
  });

  test('else an estimate from its sets and rests, to 5 minutes', () => {
    // 4 exercises × 3 sets × (45 s + 90 s rest) = 27 min → 25 min.
    expect(routineDuration(upperBody, 90)).toEqual({ seconds: 1500, estimated: true });
    expect(routineDuration({ ...upperBody, exercises: [] }, 90)).toBeNull();
  });

  test('a run: its distances at 6 min/km, and only its recoveries', () => {
    // 1 km (6 min) + 2 × 400 m (2 × 2:24) with 1:30 recovery each = 13:48 → 15 min.
    expect(routineDuration(sundayRun, 90)).toEqual({ seconds: 900, estimated: true });
  });

  test('a superset rests once a round', () => {
    const superset = {
      ...upperBody,
      exercises: upperBody.exercises.slice(0, 2).map((exercise) => ({
        ...exercise,
        groupKey: 'a',
        restS: 120,
        sets: [NO_TARGETS, NO_TARGETS],
      })),
    };
    // 4 sets × 45 s + 2 rounds × 2 min = 7 min → 5 min.
    expect(routineDuration(superset, 90)).toEqual({ seconds: 300, estimated: true });
  });
});
