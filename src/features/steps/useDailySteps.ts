import { skipToken, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchDailySteps } from './api';

// Everything saved about steps sits under ['daily_steps', userId, …], so
// one invalidation refreshes every month.
export function dailyStepsQueryKey(userId: string | undefined) {
  return ['daily_steps', userId] as const;
}

// Each day's saved steps between `from` and `to` ("2026-10-01" to
// "2026-10-31"), by day.
export function useDailySteps(from: string, to: string) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: [...dailyStepsQueryKey(userId), from, to],
    queryFn: userId ? () => fetchDailySteps(from, to) : skipToken,
  });
}
