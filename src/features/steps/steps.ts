// The daily step goal: its range matches profiles_daily_step_goal_check, and
// Edita el perfil changes it 500 at a time.
export const STEP_GOAL_MIN = 1000;
export const STEP_GOAL_MAX = 50000;
export const STEP_GOAL_STEP = 500;
export const DEFAULT_STEP_GOAL = 10000;

export type StepProgress = {
  // 0–1, for the bar.
  fraction: number;
  // Whole percent, rounded down so 100 means the goal is really reached. It
  // can go past 100.
  percent: number;
  // Steps still to go, 0 once reached.
  remaining: number;
  reached: boolean;
};

// "6.240 / 10.000 passos · 3.760 per arribar · 62 %".
export function stepProgress(steps: number, goal: number): StepProgress {
  const ratio = goal > 0 ? steps / goal : 0;
  return {
    fraction: Math.min(1, ratio),
    percent: Math.floor(ratio * 100),
    remaining: Math.max(0, goal - steps),
    reached: steps >= goal,
  };
}

// The goal one step up or down, kept in range.
export function changeStepGoal(goal: number, direction: 1 | -1): number {
  return Math.min(STEP_GOAL_MAX, Math.max(STEP_GOAL_MIN, goal + direction * STEP_GOAL_STEP));
}
