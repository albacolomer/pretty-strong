import { weeklyGoal } from '@/features/history/entries';
import { useRoutines } from '@/features/routines/useRoutines';
import { useWeeklySports } from '@/features/schedule/useWeeklySports';

import { useProfile } from './useProfile';

// Workouts a week to aim for: your own goal, else the days your routines
// or sports are planned on; null when there's neither.
export function useWeeklyGoal(): number | null {
  const { data: profile } = useProfile();
  const { data: routines = [] } = useRoutines();
  const { data: sports = [] } = useWeeklySports();
  return weeklyGoal(profile?.weekly_goal ?? null, routines, sports);
}
