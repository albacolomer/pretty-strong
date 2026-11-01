import { ringDashes } from './ring';

const oneDecimal = (values: number[] | null) =>
  values?.map((value) => Math.round(value * 10) / 10) ?? null;

describe('ringDashes', () => {
  test("matches the design: 3 of 6 workouts", () => {
    const dashes = ringDashes(6, 3);

    expect(oneDecimal(dashes.track)).toEqual([111.4, 8]);
    expect(oneDecimal(dashes.done)).toEqual([111.4, 8, 111.4, 8, 111.4, 366.1]);
    expect(Math.round(dashes.rotation)).toBe(-88);
  });

  test('with nothing done, there is only the track', () => {
    expect(ringDashes(4, 0).done).toBeNull();
  });

  test('all done draws every segment', () => {
    expect(ringDashes(4, 4).done).toEqual(ringDashes(4, 4).track);
  });

  test('more done than the goal fills the ring, no more', () => {
    expect(ringDashes(3, 5).done).toEqual(ringDashes(3, 5).track);
  });

  test('the done dashes and gaps add up to the whole circle', () => {
    const total = (ringDashes(5, 2).done ?? []).reduce((sum, value) => sum + value, 0);

    expect(total).toBeCloseTo(2 * Math.PI * 114);
  });

  test('a single segment is the circle with one gap at the top', () => {
    expect(oneDecimal(ringDashes(1, 0).track)).toEqual([708.3, 8]);
  });
});
