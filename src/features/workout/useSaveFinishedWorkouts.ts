import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { useToast } from '@/components/ui';
import { isNetworkError } from '@/lib/errors';

import { finishWorkout } from './api';
import { useWorkoutStore } from './workoutStore';

// Saves finished workouts to the database (US-22): straight away, and
// again whenever the app comes back to the front, until each one is in.
// Mounted once, under the tabs, so it runs whatever screen is open.
export function useSaveFinishedWorkouts() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const pending = useWorkoutStore((state) => state.pending);
  const removePending = useWorkoutStore((state) => state.removePending);
  // Being saved right now, so a second trigger doesn't send it twice.
  const saving = useRef(new Set<string>());
  // Already told "no signal" about, so it's said once per workout.
  const toldOffline = useRef(new Set<string>());

  useEffect(() => {
    function saveAll() {
      for (const workout of useWorkoutStore.getState().pending) {
        if (saving.current.has(workout.id)) continue;
        saving.current.add(workout.id);
        finishWorkout(workout)
          .then(() => {
            removePending(workout.id);
            showToast({ message: t('workout.saved') });
            return Promise.all([
              queryClient.invalidateQueries({ queryKey: ['sessions'] }),
              queryClient.invalidateQueries({ queryKey: ['history'] }),
            ]);
          })
          .catch((error: unknown) => {
            if (toldOffline.current.has(workout.id)) return;
            toldOffline.current.add(workout.id);
            showToast({
              message: isNetworkError(error) ? t('workout.savedLater') : t('workout.saveFailed'),
            });
          })
          .finally(() => saving.current.delete(workout.id));
      }
    }

    saveAll();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') saveAll();
    });
    return () => subscription.remove();
  }, [pending, removePending, queryClient, showToast, t]);
}
