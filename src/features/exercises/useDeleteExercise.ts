import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useActionSheet, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { useRoutines } from '@/features/routines/useRoutines';
import { useAppLanguage } from '@/lib/i18n';

import { setExerciseDeleted } from './api';
import { exerciseName, type Exercise } from './exercise';
import { archivedExercisesQueryKey } from './useArchiveExercise';
import { exercisesQueryKey } from './useExercises';

type DeleteInput = { id: string; wasArchived: boolean };

// Deleting, or undoing it. It leaves the library and the archived list at
// once (optimistic) and comes back if saving fails. Messages live here, as
// the screen that deleted it may already have closed. Routines are fetched
// again either way: a deleted exercise leaves them.
function useSetExerciseDeleted(deleted: boolean) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const userId = session?.user.id;
  const keys = [exercisesQueryKey(userId), archivedExercisesQueryKey(userId)];

  return useMutation({
    mutationFn: ({ id, wasArchived }: DeleteInput) => setExerciseDeleted(id, deleted, wasArchived),
    onMutate: async ({ id }) => {
      if (!deleted) return undefined;
      // Stop a refetch in flight from putting it back in the meantime.
      await Promise.all(keys.map((key) => queryClient.cancelQueries({ queryKey: key, exact: true })));
      const previous = keys.map((key) => queryClient.getQueryData<Exercise[]>(key));
      for (const key of keys) {
        queryClient.setQueryData<Exercise[]>(key, (current) =>
          current?.filter((exercise) => exercise.id !== id),
        );
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      context?.previous.forEach((list, index) => queryClient.setQueryData(keys[index], list));
      showToast({ message: t(deleted ? 'exercises.deleteError' : 'exercises.undoDeleteError') });
    },
    onSettled: () =>
      Promise.all([
        ...keys.map((key) => queryClient.invalidateQueries({ queryKey: key, exact: true })),
        queryClient.invalidateQueries({ queryKey: ['routines'] }),
      ]),
  });
}

// Delete one of your exercises (data rule 3: hidden everywhere but your
// history), with an undo toast instead of "Are you sure?". If it's in any
// of your routines, it says which first, since deleting takes it out of
// them. `onDeleted` runs once it's gone, e.g. to leave its page.
export function useDeleteExercise() {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const showToast = useToast();
  const showActionSheet = useActionSheet();
  const { data: routines = [] } = useRoutines();
  const remove = useSetExerciseDeleted(true);
  const restore = useSetExerciseDeleted(false);

  return function deleteExercise(
    exercise: Exercise,
    { wasArchived, onDeleted }: { wasArchived: boolean; onDeleted?: () => void },
  ) {
    const name = exerciseName(exercise, language);
    const input = { id: exercise.id, wasArchived };

    function go() {
      remove.mutate(input);
      onDeleted?.();
      showToast({
        message: t('exercises.deleted', { name }),
        action: { label: t('common.undo'), onPress: () => restore.mutate(input) },
      });
    }

    const inRoutines = routines.filter((routine) =>
      routine.exercises.some((item) => item.exerciseId === exercise.id),
    );
    if (inRoutines.length === 0) {
      go();
      return;
    }
    showActionSheet(
      {
        title: t('exercises.inRoutines', {
          count: inRoutines.length,
          name,
          routines: inRoutines.map((routine) => routine.name).join(', '),
        }),
        options: [t('exercises.deleteAnyway'), t('common.cancel')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index === 0) go();
      },
    );
  };
}
