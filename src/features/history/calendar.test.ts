import { dateKey } from '@/features/schedule/dates';

import { addMonths, formatMonth, monthWeeks, startOfMonth } from './calendar';

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
