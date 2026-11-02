import { addDays, dateKey, startOfWeek } from '@/features/schedule/dates';
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

// The day picked after moving to `month`: today in today's month; in an
// earlier one, its latest day with a workout, else its last day; in a later
// one, its first day with an event (US-30), else the 1st.
export function dayToShow(
  month: Date,
  today: Date,
  workoutDays: ReadonlySet<string>,
  eventDays: ReadonlySet<string>,
): string {
  const prefix = dateKey(month).slice(0, 7);
  const todayKey = dateKey(today);
  if (todayKey.startsWith(prefix)) return todayKey;
  const inMonth = (days: ReadonlySet<string>) =>
    [...days].filter((day) => day.startsWith(prefix)).sort();
  if (prefix > todayKey) return inMonth(eventDays).at(0) ?? dateKey(startOfMonth(month));
  return inMonth(workoutDays).at(-1) ?? dateKey(addDays(addMonths(month, 1), -1));
}
