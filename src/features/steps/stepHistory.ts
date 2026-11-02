import { addDays, dateKey } from '@/features/schedule/dates';

// Saving the iPhone's step counts for the calendar (US-31). No React here.

// How many days the phone keeps: Motion & Fitness has the last 7 × 24 h,
// so the day 7 days back is only partly there and isn't read.
export const DAYS_ON_THE_PHONE = 7;

export type StepDay = {
  // "2026-10-20".
  date: string;
  start: Date;
  end: Date;
};

// The days to read from the phone, oldest first: each from midnight to the
// next midnight, and today until now.
export function stepDays(today: Date, now: Date): StepDay[] {
  return Array.from({ length: DAYS_ON_THE_PHONE }, (_, index) => {
    const start = addDays(today, index + 1 - DAYS_ON_THE_PHONE);
    const isToday = index === DAYS_ON_THE_PHONE - 1;
    return { date: dateKey(start), start, end: isToday ? now : addDays(start, 1) };
  });
}

export type DailySteps = { date: string; steps: number };

// What's worth saving: a day with no steps says nothing (the phone may just
// have been left at home), so it's left out.
export function stepsToSave(days: DailySteps[]): DailySteps[] {
  return days.filter((day) => day.steps > 0);
}
