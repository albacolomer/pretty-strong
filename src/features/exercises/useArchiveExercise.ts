import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchArchivedExercises, setExerciseArchived } from './api';
import type { Exercise } from './exercise';
import { exercisesQueryKey } from './useExercises';

export function archivedExercisesQueryKey(userId: string | undefined) {
  return ['exercises', userId, 'archived'] as const;
}

export function useArchivedExercises() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: archivedExercisesQueryKey(userId),
    queryFn: userId ? fetchArchivedExercises : skipToken,
  });
}

// Archive: the exercise leaves the library straight away (optimistic) and
// comes back if saving fails.
export function useArchiveExercise() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const activeKey = exercisesQueryKey(session?.user.id);
  const archivedKey = archivedExercisesQueryKey(session?.user.id);

  return useMutation({
    mutationFn: (id: string) => setExerciseArchived(id, true),
    onMutate: async (id) => {
      // Stop a refetch in flight from putting it back in the meantime.
      await queryClient.cancelQueries({ queryKey: activeKey, exact: true });
      const previous = queryClient.getQueryData<Exercise[]>(activeKey);
      queryClient.setQueryData<Exercise[]>(activeKey, (current) =>
        current?.filter((exercise) => exercise.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(activeKey, context?.previous);
    },
    onSuccess: (exercise) => {
      queryClient.setQueryData<Exercise[]>(archivedKey, (current) =>
        current ? [exercise, ...current] : current,
      );
    },
  });
}

// Restore (also "Desfés" after archiving): back into the library.
export function useRestoreExercise() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const activeKey = exercisesQueryKey(session?.user.id);
  const archivedKey = archivedExercisesQueryKey(session?.user.id);

  return useMutation({
    mutationFn: (id: string) => setExerciseArchived(id, false),
    onSuccess: (exercise) => {
      queryClient.setQueryData<Exercise[]>(archivedKey, (current) =>
        current?.filter((e) => e.id !== exercise.id),
      );
      queryClient.setQueryData<Exercise[]>(activeKey, (current) =>
        current && !current.some((e) => e.id === exercise.id) ? [...current, exercise] : current,
      );
    },
  });
}
