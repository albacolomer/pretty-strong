import { dateKey } from '@/features/schedule/dates';

import { addMonths, dayToShow, formatMonth, monthWeeks, startOfMonth } from './calendar';

const keys = (weeks: (Date | null)[][]) =>
  weeks.map((week) => week.map((day) => (day ? day.getDate() : null)));

describe('month calendar', () => {
  test('October 2026 in weeks from Monday, other months left empty', () => {
    const weeks = monthWeeks(new Date(2026, 9, 21));

    // 1 October 2026 is a Thursday; 31 is a Saturday.
    expect(keys(weeks)).toEqual([
      [null, null, null, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, 31, null],
    ]);
  });

  test('a month starting on Monday has no empty days before it', () => {
    // 1 June 2026 is a Monday.
    expect(keys(monthWeeks(new Date(2026, 5, 1)))[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('moving between months, across a year', () => {
    expect(dateKey(startOfMonth(new Date(2026, 9, 21)))).toBe('2026-10-01');
    expect(dateKey(addMonths(new Date(2026, 0, 1), -1))).toBe('2025-12-01');
    expect(formatMonth(new Date(2026, 9, 1), 'ca')).toBe('Octubre del 2026');
    expect(formatMonth(new Date(2026, 9, 1), 'en')).toBe('October 2026');
  });
});

describe('the day shown after changing month', () => {
  const today = new Date(2026, 9, 21);
  const workoutDays = new Set(['2026-09-14', '2026-09-28', '2026-10-20']);
  const eventDays = new Set(['2026-09-20', '2026-11-14', '2026-11-29']);

  test('today in this month; before it the latest day trained, else the last day', () => {
    expect(dayToShow(new Date(2026, 9, 1), today, workoutDays, eventDays)).toBe('2026-10-21');
    expect(dayToShow(new Date(2026, 8, 1), today, workoutDays, eventDays)).toBe('2026-09-28');
    expect(dayToShow(new Date(2026, 7, 1), today, workoutDays, eventDays)).toBe('2026-08-31');
  });

  test('after it, the first event, else the 1st', () => {
    expect(dayToShow(new Date(2026, 10, 1), today, workoutDays, eventDays)).toBe('2026-11-14');
    expect(dayToShow(new Date(2026, 11, 1), today, workoutDays, eventDays)).toBe('2026-12-01');
  });
});
