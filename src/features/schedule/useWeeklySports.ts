import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Routine, Weekday } from '@/features/routines/routine';
import { routinesQueryKey } from '@/features/routines/useRoutines';

import type { WeeklySport } from './sports';
import {
  addWeeklySport,
  fetchWeeklySports,
  removeWeeklySport,
  reorderDay,
  updateWeeklySport,
} from './sportsApi';
import type { DayActivity } from './week';

export function weeklySportsQueryKey(userId: string | undefined) {
  return ['weekly_sports', userId] as const;
}

export function useWeeklySports() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: weeklySportsQueryKey(userId),
    queryFn: userId ? fetchWeeklySports : skipToken,
  });
}

// Changes show in the week straight away and are put back if saving fails.
// Messages live here, so they show even if a sheet has closed.
function useSportsMutation<T>(
  save: (input: T) => Promise<void>,
  change: (sports: WeeklySport[], input: T) => WeeklySport[],
) {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const key = weeklySportsQueryKey(session?.user.id);

  return useMutation({
    mutationFn: (input: T) => save(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<WeeklySport[]>(key);
      queryClient.setQueryData<WeeklySport[]>(key, (current) => change(current ?? [], input));
      return { previous };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(key, context?.previous);
      showToast({ message: t('schedule.saveError') });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key, exact: true }),
  });
}

export function useAddSport() {
  return useSportsMutation(
    (sport: WeeklySport) => addWeeklySport(sport),
    (sports, sport) => [...sports.filter((other) => other.id !== sport.id), sport],
  );
}

export function useUpdateSport() {
  return useSportsMutation(
    ({ id, change }: { id: string; change: Pick<WeeklySport, 'startTime' | 'durationS'> }) =>
      updateWeeklySport(id, change),
    (sports, { id, change }) =>
      sports.map((sport) => (sport.id === id ? { ...sport, ...change } : sport)),
  );
}

export function useRemoveSport() {
  return useSportsMutation(
    (sport: WeeklySport) => removeWeeklySport(sport.id),
    (sports, sport) => sports.filter((other) => other.id !== sport.id),
  );
}

// A day's new order after a drag: positions 0, 1, 2… for its routines and
// sports, shown at once in both lists.
export function useReorderDay() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const sportsKey = weeklySportsQueryKey(session?.user.id);
  const routinesKey = routinesQueryKey(session?.user.id);

  return useMutation({
    mutationFn: ({ day, order }: { day: Weekday; order: DayActivity[] }) =>
      reorderDay(
        day,
        order.map((activity) =>
          activity.kind === 'routine'
            ? { kind: 'routine', id: activity.routine.id }
            : { kind: 'sport', id: activity.sport.id },
        ),
      ),
    onMutate: async ({ day, order }) => {
      await queryClient.cancelQueries({ queryKey: sportsKey, exact: true });
      await queryClient.cancelQueries({ queryKey: routinesKey, exact: true });
      const previous = {
        sports: queryClient.getQueryData<WeeklySport[]>(sportsKey),
        routines: queryClient.getQueryData<Routine[]>(routinesKey),
      };
      const position = new Map(order.map((activity, index) => [activity.key, index]));
      queryClient.setQueryData<WeeklySport[]>(sportsKey, (current) =>
        current?.map((sport) => {
          const index = position.get(`sport:${sport.id}`);
          return index === undefined ? sport : { ...sport, position: index };
        }),
      );
      queryClient.setQueryData<Routine[]>(routinesKey, (current) =>
        current?.map((routine) => {
          const index = position.get(`routine:${routine.id}`);
          return index === undefined
            ? routine
            : { ...routine, dayPositions: { ...routine.dayPositions, [day]: index } };
        }),
      );
      return previous;
    },
    onError: (_error, _input, previous) => {
      queryClient.setQueryData(sportsKey, previous?.sports);
      queryClient.setQueryData(routinesKey, previous?.routines);
      showToast({ message: t('schedule.saveError') });
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: sportsKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: routinesKey, exact: true }),
      ]),
  });
}
