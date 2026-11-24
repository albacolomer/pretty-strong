import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';

import type { Addition, SportDrop } from './additions';
import { addDays, dateKey, weekdayOf } from './dates';
import type { Move } from './moves';
import type { WeeklySport } from './sports';

// The week as your routines' days (weekly_schedule) and your sports
// (weekly_sports) make it. No React here.

// The routines planned on a day, in their order on it. Empty: a rest day.
export function routinesOnDay(routines: readonly Routine[], day: Weekday): Routine[] {
  return routines
    .map((routine, index) => ({ routine, index }))
    .filter(({ routine }) => routine.weekdays.includes(day))
    .sort(
      (a, b) =>
        (a.routine.dayPositions[day] ?? 0) - (b.routine.dayPositions[day] ?? 0) || a.index - b.index,
    )
    .map(({ routine }) => routine);
}

// Where a routine added to a day goes: after the ones already there.
export function nextPosition(routines: readonly Routine[], day: Weekday): number {
  const positions = routinesOnDay(routines, day).map((routine) => routine.dayPositions[day] ?? 0);
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}

// The routine with `day` added, at `position`.
export function withDay(routine: Routine, day: Weekday, position: number): Routine {
  if (routine.weekdays.includes(day)) return routine;
  return {
    ...routine,
    weekdays: [...routine.weekdays, day].sort((a, b) => a - b),
    dayPositions: { ...routine.dayPositions, [day]: position },
  };
}

// The routine without `day`.
export function withoutDay(routine: Routine, day: Weekday): Routine {
  const { [day]: _removed, ...dayPositions } = routine.dayPositions;
  return {
    ...routine,
    weekdays: routine.weekdays.filter((other) => other !== day),
    dayPositions,
  };
}

// One thing planned on a day: a routine or a sport. A routine moved there
// this week (see moves.ts) has `from`: the day it was planned on. One added
// to that week only (see additions.ts) has `addedId`: its addition; an
// added sport's `sport.id` is that addition's id too.
export type DayActivity =
  | { kind: 'routine'; key: string; routine: Routine; from?: string; addedId?: string }
  | { kind: 'sport'; key: string; sport: WeeklySport; addedId?: string };

// A day's routines and sports together, in their order on it (they share
// one scale of positions); ties put routines first.
export function activitiesOnDay(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  day: Weekday,
): DayActivity[] {
  const planned = [
    ...routinesOnDay(routines, day).map((routine, index) => ({
      activity: { kind: 'routine', key: `routine:${routine.id}`, routine } as DayActivity,
      position: routine.dayPositions[day] ?? 0,
      order: index,
    })),
    ...sports
      .filter((sport) => sport.weekday === day)
      .map((sport, index) => ({
        activity: { kind: 'sport', key: `sport:${sport.id}`, sport } as DayActivity,
        position: sport.position,
        order: 1000 + index,
      })),
  ];
  return planned
    .sort((a, b) => a.position - b.position || a.order - b.order)
    .map(({ activity }) => activity);
}

// What's on a date, its week's changes counted (US-29): the usual day minus
// the routines moved away from it and the sports dropped, plus the routines
// moved to it and what's added to it, in their places.
export function activitiesOnDate(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  moves: readonly Move[],
  date: Date,
  additions: readonly Addition[] = [],
  drops: readonly SportDrop[] = [],
): DayActivity[] {
  const key = dateKey(date);
  const day = weekdayOf(date);
  const movedAway = (routineId: string) =>
    moves.some((move) => move.routineId === routineId && move.plannedDate === key);
  const dropped = (sportId: string) =>
    drops.some((drop) => drop.sportId === sportId && drop.date === key);
  const usual = activitiesOnDay(routines, sports, day)
    .filter((activity) =>
      activity.kind === 'sport' ? !dropped(activity.sport.id) : !movedAway(activity.routine.id),
    )
    .map((activity, order) => ({
      activity,
      position:
        activity.kind === 'routine'
          ? (activity.routine.dayPositions[day] ?? 0)
          : activity.sport.position,
      order,
    }));
  const movedIn = moves
    .filter((move) => move.movedTo === key)
    .flatMap((move, index) => {
      const routine = routines.find((other) => other.id === move.routineId);
      if (!routine) return [];
      const activity: DayActivity = {
        kind: 'routine',
        key: `routine:${routine.id}@${move.plannedDate}`,
        routine,
        from: move.plannedDate,
      };
      // After the day's own ones at the same place.
      return [{ activity, position: move.position, order: 1000 + index }];
    });
  const routinesThere = new Set(
    [...usual.map(({ activity }) => activity), ...movedIn.map(({ activity }) => activity)].flatMap(
      (activity) => (activity.kind === 'routine' ? [activity.routine.id] : []),
    ),
  );
  const added = additions
    .filter((addition) => addition.date === key)
    .flatMap((addition, index): { activity: DayActivity; position: number; order: number }[] => {
      const order = 2000 + index;
      if (addition.sport !== null) {
        const sport: WeeklySport = {
          id: addition.id,
          weekday: day,
          sport: addition.sport,
          customName: addition.customName,
          startTime: addition.startTime,
          durationS: addition.durationS,
          position: addition.position,
        };
        const activity: DayActivity = {
          kind: 'sport',
          key: `addition:${addition.id}`,
          sport,
          addedId: addition.id,
        };
        return [{ activity, position: addition.position, order }];
      }
      const routine = routines.find((other) => other.id === addition.routineId);
      // Gone (deleted), or there already: a routine is on a day once.
      if (!routine || routinesThere.has(routine.id)) return [];
      routinesThere.add(routine.id);
      const activity: DayActivity = {
        kind: 'routine',
        key: `addition:${addition.id}`,
        routine,
        addedId: addition.id,
      };
      return [{ activity, position: addition.position, order }];
    });
  return [...usual, ...movedIn, ...added]
    .sort((a, b) => a.position - b.position || a.order - b.order)
    .map(({ activity }) => activity);
}

// The next day after `today` with something planned, up to a week ahead
// (the same weekday next week included), the weeks' changes counted: how
// many days away, its weekday and what's on it. Null when nothing is
// planned all week.
export function nextPlannedDay(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  today: Date,
  moves: readonly Move[] = [],
  additions: readonly Addition[] = [],
  drops: readonly SportDrop[] = [],
): { inDays: number; weekday: Weekday; activities: DayActivity[] } | null {
  for (let inDays = 1; inDays <= 7; inDays += 1) {
    const date = addDays(today, inDays);
    const weekday = weekdayOf(date);
    const activities = activitiesOnDate(routines, sports, moves, date, additions, drops);
    if (activities.length > 0) return { inDays, weekday, activities };
  }
  return null;
}

// Where something added to a date goes: after everything on it.
export function nextDatePosition(activities: readonly DayActivity[], day: Weekday): number {
  const positions = activities.map((activity) =>
    activity.kind === 'sport' ? activity.sport.position : (activity.routine.dayPositions[day] ?? 0),
  );
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}

// Where something added to a day goes: after its routines and sports.
export function nextDayPosition(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  day: Weekday,
): number {
  const positions = [
    ...routinesOnDay(routines, day).map((routine) => routine.dayPositions[day] ?? 0),
    ...sports.filter((sport) => sport.weekday === day).map((sport) => sport.position),
  ];
  return positions.length === 0 ? 0 : Math.max(...positions) + 1;
}

// "6 entrenaments · 2 esports · 1 dia de descans": routines and sports
// planned across the week, and the days with neither.
export function weekSummary(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
): { workouts: number; sports: number; restDays: number } {
  return {
    workouts: routines.reduce((total, routine) => total + routine.weekdays.length, 0),
    sports: sports.length,
    restDays: WEEKDAYS.filter((day) => activitiesOnDay(routines, sports, day).length === 0)
      .length,
  };
}
