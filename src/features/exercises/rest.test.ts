import { adjustRest, APP_DEFAULT_REST_S, formatRest } from './rest';

describe('formatRest', () => {
  test.each([
    [0, '0:00'],
    [45, '0:45'],
    [90, '1:30'],
    [125, '2:05'],
    [600, '10:00'],
  ])('%i s → %s', (seconds, text) => {
    expect(formatRest(seconds)).toBe(text);
  });
});

describe('adjustRest', () => {
  test('starts from the app default when the exercise has none', () => {
    expect(adjustRest(null, 15)).toBe(APP_DEFAULT_REST_S + 15);
    expect(adjustRest(null, -15)).toBe(APP_DEFAULT_REST_S - 15);
  });

  test('moves in 15-second steps and snaps odd values back onto the grid', () => {
    expect(adjustRest(120, 15)).toBe(135);
    expect(adjustRest(100, 15)).toBe(120);
  });

  test('stays between 0 and 10 minutes', () => {
    expect(adjustRest(0, -15)).toBe(0);
    expect(adjustRest(600, 15)).toBe(600);
  });
});
