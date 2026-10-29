import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRoutines } from '@/features/routines/useRoutines';
import { deleteSession } from '@/features/workout/api';
import { summarize } from '@/features/workout/workoutSummary';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import { isNetworkError } from '@/lib/errors';

import { fetchBeats, fetchHistoryEntries, fetchPastWorkout, saveWorkout } from './api';
import { pendingEntry, type HistoryEntry } from './entries';
import type { PastWorkout } from './pastWorkout';

// Everything History shows sits under ['history', userId, …], so one
// invalidation refreshes the list and any workout in it.
export function historyQueryKey(userId: string | undefined) {
  return ['history', userId] as const;
}

// All your workouts, newest first, with the ones finished with no signal
// (not in the database yet) among them.
export function useHistoryEntries() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const pending = useWorkoutStore((state) => state.pending);
  const { data: routines = [] } = useRoutines();
  const query = useQuery({
    queryKey: [...historyQueryKey(userId), 'entries'],
    queryFn: userId ? fetchHistoryEntries : skipToken,
  });

  const saved = query.data ?? [];
  const waiting = pending
    .filter((workout) => !saved.some((entry) => entry.id === workout.id))
    .map((workout) =>
      pendingEntry(
        workout,
        routines.find((routine) => routine.id === workout.routineId),
      ),
    );
  const entries: HistoryEntry[] = [...waiting, ...saved].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return { ...query, entries };
}

// How many exercises beat last time in these workouts (Avui's "Tot fet"):
// the saved ones from the database, the ones waiting for signal from the
// phone's copy, which still knows its last time. Null while loading or
// without signal.
export function useBeats(entries: readonly HistoryEntry[]): number | null {
  const { session } = useAuth();
  const userId = session?.user.id;
  const pending = useWorkoutStore((state) => state.pending);
  // Only workouts with exercises can beat anything.
  const saved = entries.filter((entry) => !entry.pending && entry.exercises > 0);
  const query = useQuery({
    queryKey: [...historyQueryKey(userId), 'beats', ...saved.map((entry) => entry.id)],
    queryFn: userId && saved.length > 0 ? () => fetchBeats(saved) : skipToken,
  });

  const waiting = pending
    .filter((workout) => entries.some((entry) => entry.pending && entry.id === workout.id))
    .reduce((total, workout) => total + summarize(workout, workout.endedAt).highlights.length, 0);
  if (saved.length === 0) return waiting;
  return query.data === undefined ? null : query.data + waiting;
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

// Saving an edited workout, or one logged afterwards (US-23, US-24). It
// needs signal: only the live workout is kept on the phone.
export function useSaveWorkout() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workout: PastWorkout) => saveWorkout(workout),
    onSuccess: () => showToast({ message: t('workout.saved') }),
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('workout.saveError'),
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['history'] }),
        queryClient.invalidateQueries({ queryKey: ['sessions'] }),
      ]),
  });
}
