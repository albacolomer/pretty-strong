import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';

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
// this week (see moves.ts) has `from`: the day it was planned on.
export type DayActivity =
  | { kind: 'routine'; key: string; routine: Routine; from?: string }
  | { kind: 'sport'; key: string; sport: WeeklySport };

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

// What's on a date, this week's moves counted (US-29): the usual day minus
// the routines moved away from it, plus the ones moved to it, in their
// places. Sports never move.
export function activitiesOnDate(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  moves: readonly Move[],
  date: Date,
): DayActivity[] {
  const key = dateKey(date);
  const day = weekdayOf(date);
  const movedAway = (routineId: string) =>
    moves.some((move) => move.routineId === routineId && move.plannedDate === key);
  const usual = activitiesOnDay(routines, sports, day)
    .filter((activity) => activity.kind === 'sport' || !movedAway(activity.routine.id))
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
  return [...usual, ...movedIn]
    .sort((a, b) => a.position - b.position || a.order - b.order)
    .map(({ activity }) => activity);
}

// The next day after `today` with something planned, up to a week ahead
// (the same weekday next week included), this week's moves counted: how
// many days away, its weekday and what's on it. Null when nothing is
// planned all week.
export function nextPlannedDay(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  today: Date,
  moves: readonly Move[] = [],
): { inDays: number; weekday: Weekday; activities: DayActivity[] } | null {
  for (let inDays = 1; inDays <= 7; inDays += 1) {
    const date = addDays(today, inDays);
    const weekday = weekdayOf(date);
    const activities = activitiesOnDate(routines, sports, moves, date);
    if (activities.length > 0) return { inDays, weekday, activities };
  }
  return null;
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
