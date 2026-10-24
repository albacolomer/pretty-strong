import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';

import {
  deleteWeight,
  fetchMeasurements,
  fetchWeights,
  saveMeasurements,
  saveWeight,
} from './api';
import type { BodyMeasurement, BodyWeight } from './body';

export function bodyQueryKey(userId: string | undefined) {
  return ['body', userId] as const;
}

export function useWeights() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: [...bodyQueryKey(userId), 'weights'],
    queryFn: userId ? fetchWeights : skipToken,
  });
}

export function useMeasurements() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: [...bodyQueryKey(userId), 'measurements'],
    queryFn: userId ? fetchMeasurements : skipToken,
  });
}

// Saving; messages live here, so they show after a sheet or
// screen has closed.
function useBodyMutation<T>(save: (input: T) => Promise<void>, saved: string) {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: T) => save(input),
    onSuccess: () => {
      showToast({ message: saved });
    },
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('body.saveError'),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['body'] }),
  });
}

export function useSaveWeight() {
  const { t } = useTranslation();
  return useBodyMutation(
    ({ date, weightKg }: { date: string; weightKg: number }) => saveWeight(date, weightKg),
    t('body.weightSaved'),
  );
}

export function useSaveMeasurements() {
  const { t } = useTranslation();
  return useBodyMutation(
    (measurements: BodyMeasurement[]) => saveMeasurements(measurements),
    t('body.measurementsSaved'),
  );
}

// Deleting a weight goes at once, with "Desfés" to log it back.
export function useDeleteWeight() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const restore = useSaveWeight();

  return useMutation({
    mutationFn: (weight: BodyWeight) => deleteWeight(weight.id),
    onSuccess: (_result, weight) =>
      showToast({
        message: t('body.weightDeleted'),
        action: {
          label: t('common.undo'),
          onPress: () => restore.mutate({ date: weight.date, weightKg: weight.weightKg }),
        },
      }),
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('body.saveError'),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['body'] }),
  });
}
