import { weeklyGoal } from '@/features/history/entries';
import { useRoutines } from '@/features/routines/useRoutines';

import { useProfile } from './useProfile';

// Workouts a week to aim for: your own goal, else the days your routines
// are planned on; null when there's neither.
export function useWeeklyGoal(): number | null {
  const { data: profile } = useProfile();
  const { data: routines = [] } = useRoutines();
  return weeklyGoal(profile?.weekly_goal ?? null, routines);
}
