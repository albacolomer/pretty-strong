import { ageOn } from './age';

describe('ageOn', () => {
  test('a year more from the birthday itself', () => {
    expect(ageOn('1996-11-20', new Date(2026, 10, 19))).toBe(29);
    expect(ageOn('1996-11-20', new Date(2026, 10, 20))).toBe(30);
    expect(ageOn('1996-11-20', new Date(2026, 11, 1))).toBe(30);
  });

  test('earlier in the year than the birthday month', () => {
    expect(ageOn('1996-11-20', new Date(2026, 0, 5))).toBe(29);
  });

  test('born on 29 February', () => {
    expect(ageOn('2000-02-29', new Date(2026, 1, 28))).toBe(25);
    expect(ageOn('2000-02-29', new Date(2026, 2, 1))).toBe(26);
  });
});
