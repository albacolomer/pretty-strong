import { formatDuration, type RoutineLabel } from '@/features/routines/routine';
import { countsAsWorkout, type Sport } from '@/features/schedule/sports';
import { addDays, dateKey, fromDateKey, startOfWeek } from '@/features/schedule/dates';
import type { FinishedWorkout } from '@/features/workout/activeWorkout';
import { shownNumbers } from '@/features/workout/activeWorkout';
import { formatPace, pace } from '@/features/workout/cardio';
import { summarize } from '@/features/workout/workoutSummary';
import type { Language } from '@/lib/i18n';

// Your finished workouts with their totals (see workout_summaries()), as
// the calendar, the lists and Profile's numbers use them. No React here.

export type HistoryEntry = {
  id: string;
  date: string;
  routineName: string | null;
  // The routine's type, for its icon and what its row shows; null without
  // a routine.
  routineLabel: RoutineLabel | null;
  customLabel: string | null;
  // A sport's session: which sport, and its own name for "Altres".
  sport: Sport | null;
  sportName: string | null;
  logMode: 'live' | 'quick';
  durationS: number | null;
  exercises: number;
  sets: number;
  volumeKg: number;
  // Run and cardio machine distance, in metres; run sets alone.
  distanceM: number;
  runDistanceM: number;
  // A run's seconds per km; null without distance and time.
  pace: number | null;
  // Finished with no signal: not in the database yet.
  pending: boolean;
};

// A workout waiting for signal, with the same totals worked out here. Its
// routine's type comes from the routines list.
export function pendingEntry(
  workout: FinishedWorkout,
  routine: { label: RoutineLabel; customLabel: string | null } | undefined,
): HistoryEntry {
  const summary = summarize(workout, workout.endedAt);
  const runSets = workout.exercises
    .filter((exercise) => exercise.exercise.trackingType === 'run' && exercise.change !== 'skipped')
    .flatMap((exercise) => exercise.sets.filter((set) => set.completedAt !== null))
    .map(shownNumbers);
  return {
    id: workout.id,
    date: workout.date,
    routineName: workout.routineName === '' ? null : workout.routineName,
    routineLabel: routine?.label ?? null,
    customLabel: routine?.customLabel ?? null,
    sport: null,
    sportName: null,
    logMode: 'live',
    durationS: summary.durationS,
    exercises: summary.exercises,
    sets: summary.sets,
    volumeKg: summary.volumeKg,
    distanceM: summary.distanceM,
    runDistanceM: runSets.reduce((total, set) => total + (set.distanceM ?? 0), 0),
    pace: pace(runSets),
    pending: true,
  };
}

// Workouts per week, by the week's Monday ("2026-10-19"). A walk or
// stretching doesn't count.
export function weeklyCounts(
  entries: readonly Pick<HistoryEntry, 'date' | 'sport'>[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!countsAsWorkout(entry)) continue;
    const week = dateKey(startOfWeek(fromDateKey(entry.date)));
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }
  return counts;
}

// A week keeps the streak going at 75% of the goal, rounded (goal 4: 3
// workouts), so one missed session doesn't end it. Without a goal, one
// workout is enough.
export function streakTarget(goal: number | null): number {
  return goal === null ? 1 : Math.max(1, Math.round(goal * 0.75));
}

// Weeks in a row that kept the streak, up to this one. This week only adds
// to it once it's kept; while it's still going it never breaks it.
export function streakWeeks(counts: Map<string, number>, goal: number | null, today: Date): number {
  const target = streakTarget(goal);
  const thisWeek = startOfWeek(today);
  let weeks = (counts.get(dateKey(thisWeek)) ?? 0) >= target ? 1 : 0;
  for (let week = addDays(thisWeek, -7); (counts.get(dateKey(week)) ?? 0) >= target; week = addDays(week, -7)) {
    weeks += 1;
  }
  return weeks;
}

// How many workouts a week to aim for: your own goal, else the days your
// routines or sports are planned on (null when nothing is planned).
export function weeklyGoal(
  ownGoal: number | null,
  routines: readonly { weekdays: readonly number[] }[],
  sports: readonly { weekday: number }[] = [],
): number | null {
  if (ownGoal !== null) return ownGoal;
  const days = new Set([
    ...routines.flatMap((routine) => routine.weekdays),
    ...sports.map((sport) => sport.weekday),
  ]).size;
  return days > 0 ? days : null;
}

// The words a row needs, already translated.
export type EntryLabels = {
  stations: (count: number) => string;
  sets: (count: number) => string;
  quick: string;
};

// What a row says after its date, by the routine's type: a run its
// distance and pace, a hybrid session its time and stations, a sport its
// time, the rest their time and kg lifted (or sets). "1 h 32 min · 7.240 kg".
export function entryDetails(
  entry: HistoryEntry,
  language: Language,
  labels: EntryLabels,
): string[] {
  const time = entry.durationS === null ? null : formatDuration(entry.durationS);
  const km = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const kg = new Intl.NumberFormat(language, { maximumFractionDigits: 0 });
  const parts: (string | null)[] = entry.sport
    ? [time]
    : entry.routineLabel === 'run' && entry.distanceM > 0
      ? [
          `${km.format(entry.distanceM / 1000)} km`,
          entry.pace === null ? time : formatPace(entry.pace),
        ]
      : entry.routineLabel === 'hybrid'
        ? [time, entry.exercises > 0 ? labels.stations(entry.exercises) : null]
        : [
            time,
            entry.volumeKg > 0
              ? `${kg.format(entry.volumeKg)} kg`
              : entry.sets > 0
                ? labels.sets(entry.sets)
                : null,
          ];
  if (entry.sets === 0 && entry.logMode === 'quick' && !entry.sport) parts.push(labels.quick);
  return parts.filter((part) => part !== null);
}

// "dc., 21 d’oct.": a row's date, short, in the app's language.
export function formatShortDate(date: string, language: Language): string {
  return new Intl.DateTimeFormat(language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(fromDateKey(date));
}
