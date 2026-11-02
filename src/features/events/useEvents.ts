import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';

import { deleteEvent, fetchEvents, saveEvent } from './api';
import type { CalendarEvent } from './events';

export function eventsQueryKey(userId: string | undefined) {
  return ['events', userId] as const;
}

// All your events, by date.
export function useEvents() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: eventsQueryKey(userId),
    queryFn: userId ? fetchEvents : skipToken,
  });
}

// Adding or changing an event. Messages live here, so they show after the
// sheet has closed.
export function useSaveEvent() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (event: CalendarEvent) => saveEvent(event),
    onSuccess: () => showToast({ message: t('events.saved') }),
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('events.saveError'),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}

// Deleting goes at once, with "Desfés" to save the same event back.
export function useDeleteEvent() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const restore = useSaveEvent();

  return useMutation({
    mutationFn: (event: CalendarEvent) => deleteEvent(event.id),
    onSuccess: (_result, event) =>
      showToast({
        message: t('events.deleted'),
        action: { label: t('common.undo'), onPress: () => restore.mutate(event) },
      }),
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('events.saveError'),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });
}
