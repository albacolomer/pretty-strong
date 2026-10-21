import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { addDays, dateKey } from '@/features/schedule/dates';
import { deleteSession } from '@/features/workout/api';

import { fetchHistory, fetchPastWorkout, saveWorkout } from './api';
import { addMonths } from './calendar';
import type { PastWorkout } from './pastWorkout';

// Everything History shows sits under ['history', userId, …], so one
// invalidation refreshes the list and any workout in it.
export function historyQueryKey(userId: string | undefined) {
  return ['history', userId] as const;
}

// One month's workouts, for the calendar (`month`: its 1st).
export function useHistoryMonth(month: Date) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const from = dateKey(month);
  const to = dateKey(addDays(addMonths(month, 1), -1));

  return useQuery({
    queryKey: [...historyQueryKey(userId), 'month', from],
    queryFn: userId ? () => fetchHistory(from, to) : skipToken,
  });
}

export function usePastWorkout(id: string) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: [...historyQueryKey(userId), 'workout', id],
    queryFn: userId ? () => fetchPastWorkout(id) : skipToken,
  });
}

// Deleting a workout (US-23), with "Desfés" instead of "Are you sure?": it
// goes at once, and undoing saves it back whole, with the same ids.
// Messages live here, so they show after the screen has closed.
export function useDeleteWorkout() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();

  // Today's week shows workouts too.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['history'] }),
      queryClient.invalidateQueries({ queryKey: ['sessions'] }),
    ]);

  const restore = useMutation({
    mutationFn: (workout: PastWorkout) => saveWorkout(workout),
    onError: () => showToast({ message: t('workout.saveError') }),
    onSettled: refresh,
  });

  return useMutation({
    mutationFn: (workout: PastWorkout) => deleteSession(workout.id),
    onSuccess: (_result, workout) =>
      showToast({
        message: t('history.deleted'),
        action: { label: t('common.undo'), onPress: () => restore.mutate(workout) },
      }),
    onError: () => showToast({ message: t('history.deleteError') }),
    onSettled: refresh,
  });
}
