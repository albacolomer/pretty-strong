import type { Routine } from '@/features/routines/routine';

import { addDays, dateKey, weekdayOf } from './dates';
import type { WeeklySport } from './sports';
import { activitiesOnDate, type DayActivity } from './week';

// Changing this week without touching the usual plan (US-29): each move
// takes one routine from the day it's planned on to another day, or off
// the week (movedTo null). Skipping to the next rest day, shifting the
// week and "Reprograma la setmana" are all made of these. Sports never
// move. No React here.

export type Move = {
  routineId: string;
  // "2026-10-27": the day the usual week has it on.
  plannedDate: string;
  // Where it goes instead; null: dropped this week.
  movedTo: string | null;
  // Its place on the new day, on the same scale as the day's own.
  position: number;
};

// One routine on the day the usual week has it: what a move moves.
export type PlannedRoutine = { routineId: string; plannedDate: string };

type RoutineActivity = Extract<DayActivity, { kind: 'routine' }>;

// A routine on a day, as planned: its own day, or the one it was moved from.
export function plannedRoutineOf(activity: RoutineActivity, date: string): PlannedRoutine {
  return { routineId: activity.routine.id, plannedDate: activity.from ?? date };
}

// The moves with `planned` put on `to` (null: off the week). Back on its
// own day, there's nothing to move.
export function withMove(
  moves: readonly Move[],
  planned: PlannedRoutine,
  to: string | null,
  position = 0,
): Move[] {
  const others = moves.filter(
    (move) => move.routineId !== planned.routineId || move.plannedDate !== planned.plannedDate,
  );
  return to === planned.plannedDate ? others : [...others, { ...planned, movedTo: to, position }];
}

// The first day after `today`, up to `weekEnd`, with nothing planned
// (moves counted). Null if there's none.
export function nextRestDate(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  moves: readonly Move[],
  today: Date,
  weekEnd: Date,
): Date | null {
  for (let date = addDays(today, 1); date.getTime() <= weekEnd.getTime(); date = addDays(date, 1)) {
    if (activitiesOnDate(routines, sports, moves, date).length === 0) return date;
  }
  return null;
}

// "Desplaça la setmana": `planned`, on `from`, goes to the next day, and so
// does every routine on the days after it; what's on `weekEnd` drops off
// the week. The other routines on `from` and all the sports stay put.
// Returns the new moves and the routines dropped.
export function shiftWeek(
  routines: readonly Routine[],
  sports: readonly WeeklySport[],
  moves: readonly Move[],
  planned: PlannedRoutine,
  from: Date,
  weekEnd: Date,
): { moves: Move[]; dropped: Routine[] } {
  const start = dateKey(from);
  let next = [...moves];
  const dropped: Routine[] = [];
  for (let date = from; date.getTime() <= weekEnd.getTime(); date = addDays(date, 1)) {
    const key = dateKey(date);
    // Where things are before the shift, so nothing moves twice.
    const there = activitiesOnDate(routines, sports, moves, date).filter(
      (activity): activity is RoutineActivity => activity.kind === 'routine',
    );
    for (const activity of there) {
      const which = plannedRoutineOf(activity, key);
      const chosen = which.routineId === planned.routineId && which.plannedDate === planned.plannedDate;
      if (key === start && !chosen) continue;
      const to = date.getTime() < weekEnd.getTime() ? dateKey(addDays(date, 1)) : null;
      if (to === null) dropped.push(activity.routine);
      const position = activity.from
        ? (moves.find(
            (move) => move.routineId === which.routineId && move.plannedDate === which.plannedDate,
          )?.position ?? 0)
        : (activity.routine.dayPositions[weekdayOf(date)] ?? 0);
      next = withMove(next, which, to, position);
    }
  }
  return { moves: next, dropped };
}
