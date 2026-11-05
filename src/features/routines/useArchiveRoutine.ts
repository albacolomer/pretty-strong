import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

import { fetchArchivedRoutines, setRoutineArchived, setRoutineDeleted } from './api';
import type { Routine } from './routine';
import { routinesQueryKey } from './useRoutines';

export function archivedRoutinesQueryKey(userId: string | undefined) {
  return ['routines', userId, 'archived'] as const;
}

export function useArchivedRoutines() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: archivedRoutinesQueryKey(userId),
    queryFn: userId ? fetchArchivedRoutines : skipToken,
  });
}

// Archive (US-06): the routine leaves the list straight away (optimistic)
// and comes back if saving fails. Messages live here, not in mutate()
// callbacks, because the editor that archived it may already have closed.
export function useArchiveRoutine() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const activeKey = routinesQueryKey(session?.user.id);
  const archivedKey = archivedRoutinesQueryKey(session?.user.id);

  return useMutation({
    mutationFn: (id: string) => setRoutineArchived(id, true),
    onMutate: async (id) => {
      // Stop a refetch in flight from putting it back in the meantime.
      await queryClient.cancelQueries({ queryKey: activeKey, exact: true });
      const previous = queryClient.getQueryData<Routine[]>(activeKey);
      queryClient.setQueryData<Routine[]>(activeKey, (current) =>
        current?.filter((routine) => routine.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(activeKey, context?.previous);
      showToast({ message: t('routines.archiveError') });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: archivedKey, exact: true }),
  });
}

// Restore (also "Desfés" after archiving): back into the list.
export function useRestoreRoutine() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const activeKey = routinesQueryKey(session?.user.id);
  const archivedKey = archivedRoutinesQueryKey(session?.user.id);

  return useMutation({
    mutationFn: (id: string) => setRoutineArchived(id, false),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: activeKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: archivedKey, exact: true }),
      ]),
    onError: () => showToast({ message: t('routines.restoreError') }),
  });
}

// Archive with an undo toast instead of "Are you sure?" (it's reversible).
// Used by the routine list's ⋯ menu and the routine editor.
export function useArchiveRoutineWithUndo() {
  const { t } = useTranslation();
  const showToast = useToast();
  const archive = useArchiveRoutine();
  const restore = useRestoreRoutine();

  return function archiveRoutine(routine: Pick<Routine, 'id' | 'name'>) {
    archive.mutate(routine.id);
    showToast({
      message: t('routines.archived', { name: routine.name }),
      action: { label: t('common.undo'), onPress: () => restore.mutate(routine.id) },
    });
  };
}

type DeleteInput = { id: string; wasArchived: boolean };

// Deleting, or undoing it. It leaves the routine lists at once
// (optimistic) and comes back if saving fails; the message lives here, as
// the editor that deleted it may already have closed.
function useSetRoutineDeleted(deleted: boolean) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const keys = [routinesQueryKey(session?.user.id), archivedRoutinesQueryKey(session?.user.id)];

  return useMutation({
    mutationFn: ({ id, wasArchived }: DeleteInput) => setRoutineDeleted(id, deleted, wasArchived),
    onMutate: async ({ id }) => {
      if (!deleted) return undefined;
      // Stop a refetch in flight from putting it back in the meantime.
      await Promise.all(keys.map((key) => queryClient.cancelQueries({ queryKey: key, exact: true })));
      const previous = keys.map((key) => queryClient.getQueryData<Routine[]>(key));
      for (const key of keys) {
        queryClient.setQueryData<Routine[]>(key, (current) =>
          current?.filter((routine) => routine.id !== id),
        );
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach((list, index) => queryClient.setQueryData(keys[index], list));
      showToast({ message: t(deleted ? 'routines.deleteError' : 'routines.restoreError') });
    },
    onSettled: () =>
      Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key, exact: true }))),
  });
}

// Delete a routine (data rule 3: hidden everywhere but your history and
// the calendar's past days), with an undo toast instead of "Are you sure?".
// Undo puts it back as it was, archived or not.
export function useDeleteRoutineWithUndo() {
  const { t } = useTranslation();
  const showToast = useToast();
  const remove = useSetRoutineDeleted(true);
  const restore = useSetRoutineDeleted(false);

  return function deleteRoutine(
    routine: Pick<Routine, 'id' | 'name'>,
    { wasArchived }: { wasArchived: boolean },
  ) {
    const input = { id: routine.id, wasArchived };
    remove.mutate(input);
    showToast({
      message: t('routines.deleted', { name: routine.name }),
      action: { label: t('common.undo'), onPress: () => restore.mutate(input) },
    });
  };
}
