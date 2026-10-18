import { adjustRest, APP_DEFAULT_REST_S, formatRest, readTypedRest } from './rest';

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

describe('readTypedRest', () => {
  test('digits fill from the right, like a microwave', () => {
    expect(readTypedRest('1')).toEqual({ display: '0:01', seconds: 1 });
    expect(readTypedRest('13')).toEqual({ display: '0:13', seconds: 13 });
    expect(readTypedRest('130')).toEqual({ display: '1:30', seconds: 90 });
  });

  test('keeps typing into what is shown', () => {
    // "1:30" with a 5 typed after it.
    expect(readTypedRest('1:305').display).toBe('13:05');
    // "0:13" with a 0 typed after it.
    expect(readTypedRest('0:130')).toEqual({ display: '1:30', seconds: 90 });
    // A digit deleted from "1:30".
    expect(readTypedRest('1:3')).toEqual({ display: '0:13', seconds: 13 });
  });

  test('reads seconds past 59, stays within 10 minutes, and empty is no rest', () => {
    expect(readTypedRest('90').seconds).toBe(90);
    expect(readTypedRest('1500').seconds).toBe(600);
    expect(readTypedRest('')).toEqual({ display: '0:00', seconds: 0 });
  });
});
