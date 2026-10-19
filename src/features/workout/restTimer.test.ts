import {
  adjustRest,
  formatCountdown,
  isPaused,
  pauseRest,
  remainingMs,
  resumeRest,
  startRest,
} from './restTimer';

const T0 = new Date('2026-10-20T17:00:00.000Z').getTime();
const next = { exerciseId: 'row', setId: 'set-3' };

describe('the rest timer', () => {
  test('ends at a moment; what’s left comes from the clock', () => {
    const timer = startRest('rest-1', 90, T0, next);

    expect(timer.endsAt).toBe('2026-10-20T17:01:30.000Z');
    expect(remainingMs(timer, T0 + 30_000)).toBe(60_000);
    // A locked phone loses nothing: after 2 minutes, it's simply over.
    expect(remainingMs(timer, T0 + 120_000)).toBe(0);
  });

  test('pauses with what’s left, and resumes from it', () => {
    const paused = pauseRest(startRest('rest-1', 90, T0, next), T0 + 30_000);
    expect(isPaused(paused)).toBe(true);
    // Time passing while paused doesn't count.
    expect(remainingMs(paused, T0 + 500_000)).toBe(60_000);

    const resumed = resumeRest(paused, T0 + 100_000);
    expect(resumed.endsAt).toBe('2026-10-20T17:02:40.000Z');
  });

  test('±15 s moves the end and the total, never below 0', () => {
    const timer = startRest('rest-1', 90, T0, next);

    expect(remainingMs(adjustRest(timer, 15, T0), T0)).toBe(105_000);
    expect(adjustRest(timer, 15, T0).totalS).toBe(105);
    expect(remainingMs(adjustRest(timer, -15, T0 + 80_000), T0 + 80_000)).toBe(0);
    expect(remainingMs(adjustRest(pauseRest(timer, T0), -15, T0), T0)).toBe(75_000);
  });

  test('counts down as minutes and seconds, rounding up', () => {
    expect(formatCountdown(90_000)).toBe('1:30');
    expect(formatCountdown(59_100)).toBe('1:00');
    expect(formatCountdown(4_000)).toBe('0:04');
    expect(formatCountdown(0)).toBe('0:00');
  });
});
