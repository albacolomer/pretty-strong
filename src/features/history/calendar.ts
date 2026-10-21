import { addDays, startOfWeek } from '@/features/schedule/dates';
import type { Language } from '@/lib/i18n';

// History's month calendar (US-23). No React here.

// The 1st of `date`'s month, at midnight.
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// A month earlier or later.
export function addMonths(month: Date, months: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + months, 1);
}

// The month's days in weeks, Monday to Sunday; days of the months around
// it are null.
export function monthWeeks(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const next = addMonths(first, 1);
  const weeks: (Date | null)[][] = [];
  for (let monday = startOfWeek(first); monday < next; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => {
        const day = addDays(monday, index);
        return day >= first && day < next ? day : null;
      }),
    );
  }
  return weeks;
}

// "Octubre del 2026", as the phone writes it in the app's language.
export function formatMonth(month: Date, language: Language): string {
  const text = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(month);
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1);
}
