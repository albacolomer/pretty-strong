import { changeStepGoal, stepProgress, STEP_GOAL_MAX, STEP_GOAL_MIN } from './steps';

describe('stepProgress', () => {
  it('shows how far along the day is', () => {
    expect(stepProgress(6240, 10000)).toEqual({
      fraction: 0.624,
      percent: 62,
      remaining: 3760,
      reached: false,
    });
  });

  it('only says 100 % once the goal is really reached', () => {
    expect(stepProgress(9999, 10000)).toMatchObject({ percent: 99, reached: false });
    expect(stepProgress(10000, 10000)).toMatchObject({ percent: 100, remaining: 0, reached: true });
  });

  it('goes past 100 % but keeps the bar full', () => {
    expect(stepProgress(12500, 10000)).toEqual({
      fraction: 1,
      percent: 125,
      remaining: 0,
      reached: true,
    });
  });

  it('starts the day at zero', () => {
    expect(stepProgress(0, 10000)).toEqual({
      fraction: 0,
      percent: 0,
      remaining: 10000,
      reached: false,
    });
  });
});

describe('changeStepGoal', () => {
  it('moves 500 steps at a time', () => {
    expect(changeStepGoal(10000, 1)).toBe(10500);
    expect(changeStepGoal(10000, -1)).toBe(9500);
  });

  it('stays in range', () => {
    expect(changeStepGoal(STEP_GOAL_MIN, -1)).toBe(STEP_GOAL_MIN);
    expect(changeStepGoal(STEP_GOAL_MAX, 1)).toBe(STEP_GOAL_MAX);
  });
});
