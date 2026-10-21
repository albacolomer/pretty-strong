import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { deleteSession } from '@/features/workout/api';

import { fetchHistoryPage, fetchPastWorkout, HISTORY_PAGE_SIZE, saveWorkout } from './api';
import type { PastWorkout } from './pastWorkout';

// Everything History shows sits under ['history', userId, …], so one
// invalidation refreshes the list and any workout in it.
export function historyQueryKey(userId: string | undefined) {
  return ['history', userId] as const;
}

// The list, a page at a time as you scroll.
export function useHistory() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useInfiniteQuery({
    queryKey: [...historyQueryKey(userId), 'list'],
    queryFn: userId ? ({ pageParam }) => fetchHistoryPage(pageParam) : skipToken,
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < HISTORY_PAGE_SIZE ? undefined : pages.length,
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
