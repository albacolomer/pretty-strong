import { useQueryClient } from '@tanstack/react-query';
import { Pedometer } from 'expo-sensors';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { startOfDay } from '@/features/schedule/dates';

import { saveDailySteps } from './api';
import { stepDays, stepsToSave } from './stepHistory';
import { dailyStepsQueryKey } from './useDailySteps';

// Saves the last 7 days' steps for the calendar (US-31): when the app opens
// and whenever it comes back to the front, before the phone forgets them.
// Quietly: with no signal it tries again next time (the phone still has
// them for a week), and it never asks for Motion & Fitness (Avui does).
// Mounted once, under the tabs.
export function useSaveDailySteps() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    // Saving right now, so a second trigger doesn't read everything twice.
    let saving = false;

    async function save() {
      if (!(await Pedometer.isAvailableAsync())) return;
      if (!(await Pedometer.getPermissionsAsync()).granted) return;
      const now = new Date();
      const days = await Promise.all(
        stepDays(startOfDay(now), now).map(async (day) => ({
          date: day.date,
          steps: (await Pedometer.getStepCountAsync(day.start, day.end)).steps,
        })),
      );
      const toSave = stepsToSave(days);
      if (toSave.length === 0) return;
      await saveDailySteps(toSave);
      await queryClient.invalidateQueries({ queryKey: dailyStepsQueryKey(userId) });
    }

    function saveOnce() {
      if (saving) return;
      saving = true;
      save()
        .catch(() => undefined)
        .finally(() => {
          saving = false;
        });
    }

    saveOnce();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') saveOnce();
    });
    return () => subscription.remove();
  }, [userId, queryClient]);
}
