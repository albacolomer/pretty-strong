import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { updateExercise, type ExerciseInput } from './api';
import type { Exercise } from './exercise';
import { exercisesQueryKey } from './useExercises';

// Saves changes to one of your exercises and swaps the new version into the
// cached library, so the list and detail screen update straight away.
export function useUpdateExercise(id: string) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const key = exercisesQueryKey(session?.user.id);

  return useMutation({
    mutationFn: (input: ExerciseInput) => updateExercise(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Exercise[]>(key, (current) =>
        current?.map((exercise) => (exercise.id === updated.id ? updated : exercise)),
      );
    },
  });
}
