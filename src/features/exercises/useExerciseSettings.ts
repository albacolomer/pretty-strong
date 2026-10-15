import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

import {
  fetchExerciseSettings,
  saveExerciseSettings,
  type ExerciseSettings,
  type ExerciseSettingsChange,
} from './api';

export const NO_SETTINGS: ExerciseSettings = { notes: null, defaultRestS: null };

export function exerciseSettingsQueryKey(userId: string | undefined) {
  return ['exerciseSettings', userId] as const;
}

export function useExerciseSettings() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: exerciseSettingsQueryKey(userId),
    queryFn: userId ? fetchExerciseSettings : skipToken,
  });
}

type SettingsByExercise = Record<string, ExerciseSettings>;

// Saves straight away and shows the change at once (optimistic). If saving
// fails, the old value comes back with a message; that lives here, not in
// mutate() callbacks, so it still works after the screen has closed.
export function useSaveExerciseSettings(exerciseId: string) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const userId = session?.user.id;
  const key = exerciseSettingsQueryKey(userId);

  return useMutation({
    mutationFn: (change: ExerciseSettingsChange) => {
      if (!userId) throw new Error('Not signed in.');
      return saveExerciseSettings(userId, exerciseId, change);
    },
    // Saves for one exercise run one after another, so quick taps on ±15 s
    // can't reach the server out of order.
    scope: { id: `exercise-settings-${exerciseId}` },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<SettingsByExercise>(key);
      queryClient.setQueryData<SettingsByExercise>(key, (current) => ({
        ...current,
        [exerciseId]: { ...NO_SETTINGS, ...current?.[exerciseId], ...change },
      }));
      return { previous };
    },
    onError: (_error, _change, context) => {
      queryClient.setQueryData(key, context?.previous);
      showToast({ message: t('exercises.detail.saveError') });
    },
  });
}
