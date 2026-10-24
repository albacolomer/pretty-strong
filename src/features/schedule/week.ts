import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';

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

// One thing planned on a day: a routine or a sport.
export type DayActivity =
  | { kind: 'routine'; key: string; routine: Routine }
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
