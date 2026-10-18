import { addDays, dateKey, startOfDay, startOfWeek, weekdayOf } from './dates';

// Tuesday 20 October 2026, mid-afternoon.
const tuesday = new Date(2026, 9, 20, 15, 30);

describe('weekdayOf', () => {
  test('counts from Monday = 1 to Sunday = 7', () => {
    expect(weekdayOf(new Date(2026, 9, 19))).toBe(1);
    expect(weekdayOf(tuesday)).toBe(2);
    expect(weekdayOf(new Date(2026, 9, 25))).toBe(7);
  });
});

describe('days and weeks', () => {
  test('starts the day at midnight and the week on Monday', () => {
    expect(startOfDay(tuesday)).toEqual(new Date(2026, 9, 20));
    expect(startOfWeek(tuesday)).toEqual(new Date(2026, 9, 19));
    expect(startOfWeek(new Date(2026, 9, 25))).toEqual(new Date(2026, 9, 19));
  });

  test('moves by calendar days, across months and the clock change', () => {
    expect(addDays(new Date(2026, 9, 31), 1)).toEqual(new Date(2026, 10, 1));
    // Clocks go back on 25 October 2026 in Spain.
    expect(addDays(new Date(2026, 9, 24), 2)).toEqual(new Date(2026, 9, 26));
  });

  test('writes the day as the database stores it', () => {
    expect(dateKey(tuesday)).toBe('2026-10-20');
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
