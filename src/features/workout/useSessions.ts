import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

import { deleteSession, fetchSessions, logQuickSession } from './api';
import type { WorkoutSession } from './session';

// One week of sessions, by its Monday and Sunday ("2026-10-19").
export function weekSessionsQueryKey(userId: string | undefined, from: string, to: string) {
  return ['sessions', userId, from, to] as const;
}

export function useWeekSessions(from: string, to: string) {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: weekSessionsQueryKey(userId, from, to),
    queryFn: userId ? () => fetchSessions(from, to) : skipToken,
  });
}

// Logging and "Desfés" show on Today straight away and are put back if
// saving fails. Messages live here, so they show even if the screen closed.
function useSessionMutation(
  from: string,
  to: string,
  save: (session: WorkoutSession) => Promise<void>,
  change: (sessions: WorkoutSession[], session: WorkoutSession) => WorkoutSession[],
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session: auth } = useAuth();
  const key = weekSessionsQueryKey(auth?.user.id, from, to);

  return useMutation({
    // Only the session: the library also passes its own context.
    mutationFn: (session: WorkoutSession) => save(session),
    onMutate: async (session) => {
      // Stop a refetch in flight from undoing it in the meantime.
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<WorkoutSession[]>(key);
      queryClient.setQueryData<WorkoutSession[]>(key, (current) => change(current ?? [], session));
      return { previous };
    },
    onError: (_error, _session, context) => {
      queryClient.setQueryData(key, context?.previous);
      showToast({ message: t('workout.saveError') });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key, exact: true }),
  });
}

export function useLogSession(from: string, to: string) {
  return useSessionMutation(from, to, logQuickSession, (sessions, session) => [
    ...sessions.filter((other) => other.id !== session.id),
    session,
  ]);
}

export function useDeleteSession(from: string, to: string) {
  return useSessionMutation(
    from,
    to,
    (session) => deleteSession(session.id),
    (sessions, session) => sessions.filter((other) => other.id !== session.id),
  );
}
