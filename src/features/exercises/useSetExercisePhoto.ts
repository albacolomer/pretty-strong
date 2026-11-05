import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';

import { setExercisePhoto } from './api';
import type { Exercise } from './exercise';
import { exercisesQueryKey } from './useExercises';

// A new photo for one of your exercises, or none (null). It's saved once
// the exercise is, often after the form has closed: the message lives
// here so it still shows, and the library updates when it's done.
export function useSetExercisePhoto() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const userId = session?.user.id;
  const key = exercisesQueryKey(userId);

  return useMutation({
    mutationFn: ({
      exercise,
      base64,
    }: {
      exercise: Pick<Exercise, 'id' | 'photoPath'>;
      base64: string | null;
    }) => {
      if (!userId) throw new Error('Not signed in.');
      return setExercisePhoto(userId, exercise, base64);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Exercise[]>(key, (current) =>
        current?.map((exercise) => (exercise.id === updated.id ? updated : exercise)),
      );
    },
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('photos.saveError'),
      }),
  });
}
