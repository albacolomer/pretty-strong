import type { Routine, Weekday } from '@/features/routines/routine';

// The week as your routines' days make it (weekly_schedule). No React here.

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
