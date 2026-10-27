import type { Weekday } from '@/features/routines/routine';
import type { Language } from '@/lib/i18n';

// Calendar days on the phone's own clock and time zone. No React here.

// 1 = Monday … 7 = Sunday, as the schedule stores them (JavaScript counts
// from Sunday = 0).
export function weekdayOf(date: Date): Weekday {
  return (((date.getDay() + 6) % 7) + 1) as Weekday;
}

// Midnight at the start of `date`'s day.
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Calendar days later (or earlier, when negative), at midnight. Built from
// the date's parts, so a daylight-saving change never shifts it.
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// The Monday of `date`'s week.
export function startOfWeek(date: Date): Date {
  return addDays(date, 1 - weekdayOf(date));
}

// Whole days since 1 January 1970, counted by calendar day: each day one
// more than the day before, whatever the clock or time zone. To pick
// something by day, e.g. a rest day's message.
export function dayNumber(date: Date): number {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

// "2026-10-20": the day as the database stores dates, in local time.
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// "2026-10-20" back to that day, at local midnight.
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "Dimarts, 20 d’octubre": weekday, day and month in the app's language,
// as the phone writes dates in it.
export function formatDayTitle(date: Date, language: Language): string {
  const text = new Intl.DateTimeFormat(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1);
}
