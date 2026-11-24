import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';

import type { Addition } from './additions';
import {
  dropInWeek,
  moveInWeek,
  nextRestDate,
  plannedRoutineOf,
  rearranged,
  shiftWeek,
  withMove,
  withPlannedMove,
  type Move,
  type WeekListItem,
} from './moves';
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

describe('Reprograma la setmana', () => {
  // Thursday to Sunday: upper on Thursday, the run on Sunday.
  const dayItem = (date: string): WeekListItem => ({ kind: 'day', key: `day:${date}`, date });
  const routineItem = (key: string, date: string): WeekListItem => ({ kind: 'routine', key, date });
  const list = [
    dayItem('2026-10-29'),
    routineItem('upper', '2026-10-29'),
    dayItem('2026-10-30'),
    dayItem('2026-10-31'),
    dayItem('2026-11-01'),
    routineItem('run', '2026-11-01'),
  ];
  const where = (items: WeekListItem[]) =>
    items.map((item) => (item.kind === 'day' ? item.date.slice(8) : `${item.key}@${item.date.slice(8)}`));

  test('a routine dragged under another day’s heading goes to that day', () => {
    // Upper dropped after Saturday's heading.
    expect(where(dropInWeek(list, 1, 3))).toEqual(['29', '30', '31', 'upper@31', '01', 'run@01']);
    // The run dragged up under Thursday's heading, before upper.
    expect(where(dropInWeek(list, 5, 1))).toEqual(['29', 'run@29', 'upper@29', '30', '31', '01']);
  });

  test('above the first heading counts as the first day', () => {
    expect(where(dropInWeek(list, 5, 0))).toEqual(['29', 'run@29', 'upper@29', '30', '31', '01']);
  });

  test('the ⋯ menu puts it at the end of the day picked', () => {
    expect(where(moveInWeek(list, 'upper', '2026-11-01'))).toEqual([
      '29',
      '30',
      '31',
      '01',
      'run@01',
      'upper@01',
    ]);
  });

  test('saving: a move only for what changed day, after the new day’s own', () => {
    const placed = [
      { planned: { routineId: 'upper', plannedDate: '2026-10-29' }, was: '2026-10-29', now: '2026-10-31' },
      { planned: { routineId: 'run', plannedDate: '2026-11-01' }, was: '2026-11-01', now: '2026-11-01' },
      { planned: { routineId: 'legs', plannedDate: '2026-10-27' }, was: '2026-10-27', now: '2026-10-28' },
    ];
    expect(rearranged(routines, sports, [], placed).moves).toEqual([
      { routineId: 'upper', plannedDate: '2026-10-29', movedTo: '2026-10-31', position: 0 },
      // Wednesday has the padel at 0: after it.
      { routineId: 'legs', plannedDate: '2026-10-27', movedTo: '2026-10-28', position: 1 },
    ]);
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

  test('from a missed day: a routine already logged stays put', () => {
    // Monday's upper missed; Tuesday's legs already done.
    const { moves } = shiftWeek(
      routines,
      sports,
      [],
      { routineId: 'upper', plannedDate: '2026-10-26' },
      day(26),
      sunday,
      (activity, date) => activity.routine.id === 'legs' && date === '2026-10-27',
    );
    expect(on(moves, tuesday)).toEqual(['routine:legs', 'routine:upper@2026-10-26']);
    expect(on(moves, day(30))).toEqual(['routine:upper@2026-10-29']);
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

describe('added to one week only', () => {
  // Legs added on Friday 30, a climbing class on Saturday 31.
  const addedLegs: Addition = {
    id: 'add-legs',
    date: '2026-10-30',
    routineId: 'legs',
    sport: null,
    customName: null,
    startTime: null,
    durationS: null,
    position: 0,
  };
  const climbing: Addition = {
    id: 'add-climb',
    date: '2026-10-31',
    routineId: null,
    sport: 'climbing',
    customName: null,
    startTime: '18:00',
    durationS: 3600,
    position: 0,
  };
  const additions = [addedLegs, climbing];
  const keys = (date: Date, list: readonly Addition[] = additions, moves: Move[] = []) =>
    activitiesOnDate(routines, sports, moves, date, list).map((a) => a.key);

  test('shows on its date, after what the usual week has there', () => {
    expect(keys(day(30))).toEqual(['addition:add-legs']);
    expect(keys(day(31))).toEqual(['addition:add-climb']);
    const [sport] = activitiesOnDate(routines, sports, [], day(31), additions);
    expect(sport).toMatchObject({
      kind: 'sport',
      addedId: 'add-climb',
      sport: { id: 'add-climb', weekday: 6, sport: 'climbing', startTime: '18:00' },
    });
    // Not the usual week's.
    expect(keys(day(23))).toEqual([]);
  });

  test('a routine already there that day is not shown twice', () => {
    const onTuesday = { ...addedLegs, date: '2026-10-27' };
    expect(keys(tuesday, [onTuesday])).toEqual(['routine:legs']);
  });

  test('a usual sport dropped that week is gone from that date only', () => {
    const drops = [{ sportId: 'padel', date: '2026-10-28' }];
    expect(activitiesOnDate(routines, sports, [], day(28), [], drops)).toEqual([]);
    expect(activitiesOnDate(routines, sports, [], new Date(2026, 10, 4), [], drops)).toHaveLength(1);
    expect(nextRestDate(routines, sports, [], tuesday, sunday, [], drops)).toEqual(day(28));
  });

  test('makes its day no rest day', () => {
    expect(nextRestDate(routines, sports, [], tuesday, sunday)).toEqual(day(30));
    expect(nextRestDate(routines, sports, [], tuesday, sunday, additions)).toBeNull();
  });

  test('an added routine moves by changing its date, not with a move', () => {
    const [activity] = activitiesOnDate(routines, sports, [], day(30), additions);
    if (activity.kind !== 'routine') throw new Error('Expected a routine.');
    const planned = plannedRoutineOf(activity, '2026-10-30');
    expect(planned).toEqual({ routineId: 'legs', plannedDate: '2026-10-30', addedId: 'add-legs' });

    const moved = withPlannedMove({ moves: [], additions, drops: [] }, planned, '2026-10-31', 1);
    expect(moved.moves).toEqual([]);
    expect(moved.additions).toContainEqual({ ...addedLegs, date: '2026-10-31', position: 1 });

    const dropped = withPlannedMove({ moves: [], additions, drops: [] }, planned, null);
    expect(dropped.additions).toEqual([climbing]);
  });

  test('a shift moves added routines a day on too; added sports stay', () => {
    const { moves, additions: after } = shiftWeek(
      routines,
      sports,
      [],
      { routineId: 'legs', plannedDate: '2026-10-27' },
      tuesday,
      sunday,
      () => false,
      additions,
    );
    expect(after).toEqual([{ ...addedLegs, date: '2026-10-31' }, climbing]);
    expect(moves.some((move) => move.plannedDate === '2026-10-30' && move.routineId === 'legs')).toBe(
      false,
    );
  });

  test('Reprograma moves an added routine by its date', () => {
    const plan = rearranged(
      routines,
      sports,
      [],
      [
        {
          planned: { routineId: 'legs', plannedDate: '2026-10-30', addedId: 'add-legs' },
          was: '2026-10-30',
          now: '2026-10-29',
        },
      ],
      additions,
    );
    expect(plan.moves).toEqual([]);
    expect(plan.additions[0]).toMatchObject({ id: 'add-legs', date: '2026-10-29' });
  });
});
