import type { HistoryEntry } from '@/features/history/entries';
import { weeklyCounts } from '@/features/history/entries';
import type { RoutineLabel } from '@/features/routines/routine';
import { addDays, dateKey, startOfWeek } from '@/features/schedule/dates';
import type { Language } from '@/lib/i18n';

// Profile → Progress (US-26): workouts per week, this month so far against
// the same days of last month, and the mix of training. Worked out from
// your workouts' totals, never stored (data rule 2). No React here.

export type WeekPoint = {
  // The week's Monday, "2026-10-19".
  weekStart: string;
  count: number;
  // This week, still going.
  current: boolean;
};

// The last `weeks` weeks, this one last.
export function weeklySeries(
  entries: readonly Pick<HistoryEntry, 'date'>[],
  today: Date,
  weeks = 6,
): WeekPoint[] {
  const counts = weeklyCounts(entries);
  const thisWeek = startOfWeek(today);
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = dateKey(addDays(thisWeek, (index - weeks + 1) * 7));
    return { weekStart, count: counts.get(weekStart) ?? 0, current: index === weeks - 1 };
  });
}

export type PeriodTotals = {
  workouts: number;
  timeS: number;
  volumeKg: number;
  runDistanceM: number;
  // Time per workout; null without any.
  averageS: number | null;
};

export function periodTotals(entries: readonly HistoryEntry[]): PeriodTotals {
  const timeS = entries.reduce((total, entry) => total + (entry.durationS ?? 0), 0);
  return {
    workouts: entries.length,
    timeS,
    volumeKg: Math.round(entries.reduce((total, entry) => total + entry.volumeKg, 0) * 100) / 100,
    runDistanceM: entries.reduce((total, entry) => total + entry.runDistanceM, 0),
    averageS: entries.length > 0 ? Math.round(timeS / entries.length) : null,
  };
}

export type MonthSoFar = {
  // This month from the 1st to today.
  current: PeriodTotals;
  // Last month over the same days (1st to the same date, or its end).
  previous: PeriodTotals;
  // That stretch of last month, as "2026-09-01" … "2026-09-22".
  previousFrom: string;
  previousTo: string;
  // This month's workouts, for the training mix.
  entries: HistoryEntry[];
};

export function monthSoFar(entries: readonly HistoryEntry[], today: Date): MonthSoFar {
  const from = dateKey(new Date(today.getFullYear(), today.getMonth(), 1));
  const to = dateKey(today);
  const previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousEnd = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    Math.min(today.getDate(), new Date(today.getFullYear(), today.getMonth(), 0).getDate()),
  );
  const previousFrom = dateKey(previousStart);
  const previousTo = dateKey(previousEnd);
  const between = (start: string, end: string) =>
    entries.filter((entry) => entry.date >= start && entry.date <= end);
  const current = between(from, to);

  return {
    current: periodTotals(current),
    previous: periodTotals(between(previousFrom, previousTo)),
    previousFrom,
    previousTo,
    entries: current,
  };
}

export type MixItem = {
  label: RoutineLabel | null;
  // A custom type's own name.
  customLabel: string | null;
  count: number;
};

// Workouts by routine type, most first; each custom type on its own.
export function trainingMix(entries: readonly HistoryEntry[]): MixItem[] {
  const items = new Map<string, MixItem>();
  for (const entry of entries) {
    const customLabel = entry.routineLabel === 'custom' ? entry.customLabel : null;
    const key = customLabel ? `custom:${customLabel}` : (entry.routineLabel ?? 'none');
    const item = items.get(key) ?? { label: entry.routineLabel, customLabel, count: 0 };
    items.set(key, { ...item, count: item.count + 1 });
  }
  return [...items.values()].sort((a, b) => b.count - a.count);
}

// "74,8 t" from a tonne up, else "850 kg".
export function formatVolume(kg: number, language: Language): string {
  if (kg >= 1000) {
    const tonnes = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
    return `${tonnes.format(kg / 1000)} t`;
  }
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(kg)} kg`;
}

// "18,3 km".
export function formatKm(metres: number, language: Language): string {
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(metres / 1000)} km`;
}
