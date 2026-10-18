import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';

import { nextPosition, routinesOnDay, withDay, withoutDay } from './week';

const routine = (id: string, dayPositions: Routine['dayPositions']): Routine => ({
  ...upperBody,
  id,
  name: id,
  weekdays: Object.keys(dayPositions)
    .map(Number)
    .sort((a, b) => a - b) as Routine['weekdays'],
  dayPositions,
});

// Monday: run (morning), then upper; Thursday: upper only.
const run = routine('run', { 1: 0 });
const upper = routine('upper', { 1: 1, 4: 0 });
const legs = routine('legs', {});

describe('routinesOnDay', () => {
  test('lists a day’s routines in their order on it; none is a rest day', () => {
    expect(routinesOnDay([upper, legs, run], 1).map((r) => r.id)).toEqual(['run', 'upper']);
    expect(routinesOnDay([upper, legs, run], 4).map((r) => r.id)).toEqual(['upper']);
    expect(routinesOnDay([upper, legs, run], 7)).toEqual([]);
  });
});

describe('nextPosition', () => {
  test('puts a new routine after the others on that day', () => {
    expect(nextPosition([upper, legs, run], 1)).toBe(2);
    expect(nextPosition([upper, legs, run], 7)).toBe(0);
  });
});

describe('withDay and withoutDay', () => {
  test('adds and takes off a day, keeping the days in order', () => {
    const added = withDay(legs, 3, 0);
    expect(added).toMatchObject({ weekdays: [3], dayPositions: { 3: 0 } });
    expect(withDay(upper, 2, 5).weekdays).toEqual([1, 2, 4]);
    expect(withDay(upper, 1, 9)).toBe(upper);

    expect(withoutDay(upper, 1)).toMatchObject({ weekdays: [4], dayPositions: { 4: 0 } });
  });
});
