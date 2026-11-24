import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { saveMeasurements, saveWeight } from '@/features/body/api';
import type { BodyMeasurement } from '@/features/body/body';
import { updateProfileDetails, type ProfileChanges } from '@/features/profile/api';
import { profileQueryKey } from '@/features/profile/useProfile';
import { isNetworkError } from '@/lib/errors';

// Each step saves as you go on, without waiting: the next question shows at
// once. Nothing says "Desat ✓" after every step, only when it fails, and
// everything can be changed later on Edita el perfil or Cos.
function useFailureToast() {
  const { t } = useTranslation();
  const showToast = useToast();
  return (error: Error) =>
    showToast({ message: isNetworkError(error) ? t('workout.noSignal') : t('setup.saveError') });
}

export function useSaveSetupProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const onError = useFailureToast();

  return useMutation({
    mutationFn: (details: ProfileChanges) => {
      if (!userId) throw new Error('Not signed in.');
      return updateProfileDetails(userId, details);
    },
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
    onError,
  });
}

export function useSaveSetupWeight() {
  const queryClient = useQueryClient();
  const onError = useFailureToast();

  return useMutation({
    mutationFn: ({ date, weightKg }: { date: string; weightKg: number }) =>
      saveWeight(date, weightKg),
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['body'] }),
  });
}

export function useSaveSetupMeasurements() {
  const queryClient = useQueryClient();
  const onError = useFailureToast();

  return useMutation({
    mutationFn: (measurements: BodyMeasurement[]) => saveMeasurements(measurements),
    onError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['body'] }),
  });
}
