import { stepDays, stepsToSave } from './stepHistory';

describe('stepDays', () => {
  const today = new Date(2026, 10, 2);
  const now = new Date(2026, 10, 2, 9, 40);

  it('reads the 7 days the phone keeps, oldest first, today until now', () => {
    const days = stepDays(today, now);

    expect(days.map((day) => day.date)).toEqual([
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(days[0]).toEqual({
      date: '2026-10-27',
      start: new Date(2026, 9, 27),
      end: new Date(2026, 9, 28),
    });
    expect(days[6]).toEqual({ date: '2026-11-02', start: today, end: now });
  });

  it('goes from midnight to midnight across a clock change', () => {
    // Clocks went back on 25 October 2026 in Spain.
    const days = stepDays(new Date(2026, 9, 28), new Date(2026, 9, 28, 12));

    expect(days[2]).toEqual({
      date: '2026-10-24',
      start: new Date(2026, 9, 24),
      end: new Date(2026, 9, 25),
    });
    expect(days[3]).toEqual({
      date: '2026-10-25',
      start: new Date(2026, 9, 25),
      end: new Date(2026, 9, 26),
    });
  });
});

describe('stepsToSave', () => {
  it('leaves out days with no steps', () => {
    expect(
      stepsToSave([
        { date: '2026-10-31', steps: 0 },
        { date: '2026-11-01', steps: 8432 },
      ]),
    ).toEqual([{ date: '2026-11-01', steps: 8432 }]);
  });
});
