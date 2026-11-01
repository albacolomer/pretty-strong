import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';

import type { Move } from './moves';
import { fetchMoves, replaceMoves } from './movesApi';

// A week's moves, by the days asked for ("2026-10-25" to "2026-11-01").
export function weekMovesQueryKey(userId: string | undefined, from: string, to: string) {
  return ['schedule_overrides', userId, from, to] as const;
}

export function useWeekMoves(from: string, to: string) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: weekMovesQueryKey(userId, from, to),
    queryFn: userId ? () => fetchMoves(from, to) : skipToken,
  });
}

// Saves the week's moves, all of them at once. They show straight away and
// are put back if saving fails. Messages live here, so they show even if a
// sheet has closed.
export function useSetWeekMoves(from: string, to: string) {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const key = weekMovesQueryKey(session?.user.id, from, to);

  return useMutation({
    mutationFn: (moves: Move[]) => replaceMoves(from, to, moves),
    onMutate: async (moves) => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<Move[]>(key);
      queryClient.setQueryData<Move[]>(key, moves);
      return { previous };
    },
    onError: (error, _moves, context) => {
      queryClient.setQueryData(key, context?.previous);
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('schedule.saveError'),
      });
    },
    // Other weeks' views (the Calendar) may show these days too.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['schedule_overrides'] }),
  });
}
