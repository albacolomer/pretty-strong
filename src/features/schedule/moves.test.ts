import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';

import { nextRestDate, shiftWeek, withMove, type Move } from './moves';
import type { WeeklySport } from './sports';
import { activitiesOnDate } from './week';

const routine = (id: string, dayPositions: Routine['dayPositions']): Routine => ({
  ...upperBody,
  id,
  name: id,
  weekdays: Object.keys(dayPositions)
    .map(Number)
    .sort((a, b) => a - b) as Routine['weekdays'],
  dayPositions,
});

// The week of Monday 26 October 2026: upper on Monday and Thursday, legs on
// Tuesday, padel on Wednesday, a long run on Sunday; Friday and Saturday
// free.
const upper = routine('upper', { 1: 0, 4: 0 });
const legs = routine('legs', { 2: 0 });
const run = routine('run', { 7: 0 });
const routines = [upper, legs, run];
const padel: WeeklySport = {
  id: 'padel',
  weekday: 3,
  sport: 'padel',
  customName: null,
  startTime: '19:00',
  durationS: 5400,
  position: 0,
};
const sports = [padel];

const day = (date: number) => new Date(2026, 9, date);
const tuesday = day(27);
const sunday = new Date(2026, 10, 1);
const on = (moves: Move[], date: Date) =>
  activitiesOnDate(routines, sports, moves, date).map((activity) => activity.key);

describe('a day with this week’s moves', () => {
  test('without moves, the usual day', () => {
    expect(on([], tuesday)).toEqual(['routine:legs']);
    expect(on([], day(28))).toEqual(['sport:padel']);
    expect(on([], day(30))).toEqual([]);
  });

  test('a routine moved away, and where it went (after the day’s own)', () => {
    const moves = withMove([], { routineId: 'legs', plannedDate: '2026-10-27' }, '2026-10-28');
    expect(on(moves, tuesday)).toEqual([]);
    expect(on(moves, day(28))).toEqual(['sport:padel', 'routine:legs@2026-10-27']);
    expect(activitiesOnDate(routines, sports, moves, day(28))[1]).toMatchObject({
      from: '2026-10-27',
    });
  });

  test('moved back to its own day, there’s nothing to move', () => {
    const planned = { routineId: 'legs', plannedDate: '2026-10-27' };
    const moved = withMove([], planned, '2026-10-30');
    expect(withMove(moved, planned, '2026-10-27')).toEqual([]);
    // Moving it again replaces its move.
    expect(withMove(moved, planned, '2026-10-31')).toEqual([
      { ...planned, movedTo: '2026-10-31', position: 0 },
    ]);
  });
});

describe('nextRestDate', () => {
  test('the first day after today with nothing on it, before the week ends', () => {
    expect(nextRestDate(routines, sports, [], tuesday, sunday)).toEqual(day(30));
    const moves = withMove([], { routineId: 'legs', plannedDate: '2026-10-27' }, '2026-10-30');
    expect(nextRestDate(routines, sports, moves, tuesday, sunday)).toEqual(day(31));
    expect(nextRestDate(routines, sports, [], day(31), sunday)).toBeNull();
  });
});

describe('shiftWeek', () => {
  test('the skipped routine and everything after it a day on; Sunday’s drops off', () => {
    const { moves, dropped } = shiftWeek(
      routines,
      sports,
      [],
      { routineId: 'legs', plannedDate: '2026-10-27' },
      tuesday,
      sunday,
    );
    expect(on(moves, tuesday)).toEqual([]);
    // The padel stays on Wednesday; legs join it.
    expect(on(moves, day(28))).toEqual(['sport:padel', 'routine:legs@2026-10-27']);
    expect(on(moves, day(29))).toEqual([]);
    expect(on(moves, day(30))).toEqual(['routine:upper@2026-10-29']);
    expect(on(moves, sunday)).toEqual([]);
    expect(dropped.map((r) => r.id)).toEqual(['run']);
    expect(moves).toContainEqual({
      routineId: 'run',
      plannedDate: '2026-11-01',
      movedTo: null,
      position: 0,
    });
  });

  test('only the skipped one of the day moves', () => {
    const both = [upper, routine('legs', { 1: 1 })];
    const { moves } = shiftWeek(
      both,
      [],
      [],
      { routineId: 'legs', plannedDate: '2026-10-26' },
      day(26),
      sunday,
    );
    expect(activitiesOnDate(both, [], moves, day(26)).map((a) => a.key)).toEqual([
      'routine:upper',
    ]);
    expect(activitiesOnDate(both, [], moves, day(27)).map((a) => a.key)).toEqual([
      'routine:legs@2026-10-26',
    ]);
  });

  test('a routine already moved moves on from where it is, keeping one move', () => {
    const before = withMove([], { routineId: 'legs', plannedDate: '2026-10-27' }, '2026-10-30');
    const { moves } = shiftWeek(
      routines,
      sports,
      before,
      { routineId: 'legs', plannedDate: '2026-10-27' },
      day(30),
      sunday,
    );
    expect(moves.filter((move) => move.routineId === 'legs')).toEqual([
      { routineId: 'legs', plannedDate: '2026-10-27', movedTo: '2026-10-31', position: 0 },
    ]);
  });
});
