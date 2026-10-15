import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { createExercise, type ExerciseInput } from './api';
import type { Exercise } from './exercise';
import { exercisesQueryKey } from './useExercises';

// Saves a custom exercise and adds it to the cached library, so it shows up
// in the list straight away without reloading everything.
export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (input: ExerciseInput) => {
      if (!userId) throw new Error('Not signed in.');
      return createExercise({ ...input, ownerId: userId });
    },
    onSuccess: (exercise) => {
      queryClient.setQueryData<Exercise[]>(exercisesQueryKey(userId), (current) =>
        current ? [...current, exercise] : [exercise],
      );
    },
  });
}
