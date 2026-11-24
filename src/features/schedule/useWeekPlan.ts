import { skipToken, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';

import type { Addition, SportDrop } from './additions';
import { fetchAdditions, replaceAdditions } from './additionsApi';
import type { WeekPlan } from './moves';
import { fetchSportDrops, replaceSportDrops } from './sportDropsApi';
import { useSetWeekMoves, useWeekMoves } from './useWeekMoves';

// A week's changes on top of the usual week (US-29), for the days asked
// for ("2026-11-22" to "2026-11-29"): the routines moved, what's added, and
// the sports dropped. Each is saved whole for those days, so "Desfés" puts
// the previous ones back exactly.

// One kind of change: fetched for the days, and replaced all at once. It
// shows straight away and is put back if saving fails.
function useChanges<T>(
  table: string,
  from: string,
  to: string,
  fetch: (from: string, to: string) => Promise<T[]>,
  replace: (from: string, to: string, items: readonly T[]) => Promise<void>,
) {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const key: QueryKey = [table, userId, from, to];

  const query = useQuery({
    queryKey: key,
    queryFn: userId ? () => fetch(from, to) : skipToken,
  });
  const save = useMutation({
    mutationFn: (items: T[]) => replace(from, to, items),
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<T[]>(key);
      queryClient.setQueryData<T[]>(key, items);
      return { previous };
    },
    onError: (error, _items, context) => {
      queryClient.setQueryData(key, context?.previous);
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('schedule.saveError'),
      });
    },
    // Other views (Avui, Setmana, the Calendar) may show these days too.
    onSettled: () => queryClient.invalidateQueries({ queryKey: [table] }),
  });
  return { query, save };
}

const NONE: never[] = [];

// The week's changes, and whether they've all loaded.
export function useWeekPlan(from: string, to: string): { plan: WeekPlan; isSuccess: boolean } {
  const moves = useWeekMoves(from, to);
  const additions = useChanges<Addition>(
    'schedule_additions',
    from,
    to,
    fetchAdditions,
    replaceAdditions,
  ).query;
  const drops = useChanges<SportDrop>(
    'schedule_sport_drops',
    from,
    to,
    fetchSportDrops,
    replaceSportDrops,
  ).query;
  return {
    plan: {
      moves: moves.data ?? NONE,
      additions: additions.data ?? NONE,
      drops: drops.data ?? NONE,
    },
    isSuccess: moves.isSuccess && additions.isSuccess && drops.isSuccess,
  };
}

// Changes the week: saves what differs from `current`, and shows `message`
// with "Desfés", which puts back only what was changed.
export function useChangeWeek(from: string, to: string) {
  const { t } = useTranslation();
  const showToast = useToast();
  const setMoves = useSetWeekMoves(from, to);
  const setAdditions = useChanges<Addition>(
    'schedule_additions',
    from,
    to,
    fetchAdditions,
    replaceAdditions,
  ).save;
  const setDrops = useChanges<SportDrop>(
    'schedule_sport_drops',
    from,
    to,
    fetchSportDrops,
    replaceSportDrops,
  ).save;

  function apply(current: WeekPlan, next: WeekPlan) {
    if (next.moves !== current.moves) setMoves.mutate(next.moves);
    if (next.additions !== current.additions) setAdditions.mutate(next.additions);
    if (next.drops !== current.drops) setDrops.mutate(next.drops);
  }

  return (current: WeekPlan, next: WeekPlan, message: string) => {
    apply(current, next);
    showToast({
      message,
      action: { label: t('common.undo'), onPress: () => apply(next, current) },
    });
  };
}
