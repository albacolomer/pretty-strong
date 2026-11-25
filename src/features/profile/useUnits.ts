import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';
import { kvStorage } from '@/lib/kvStorage';
import { METRIC_UNITS, readUnits, type Units } from '@/lib/units';

import { updateProfileDetails } from './api';
import { profileQueryKey, useProfile } from './useProfile';

type UnitsState = {
  units: Units;
  setUnits: (units: Units) => void;
};

// Your units, also kept on the phone (like the language), so a workout with
// no signal still shows kg or lb as you chose.
export const useUnitsStore = create<UnitsState>()(
  persist(
    (set) => ({
      units: METRIC_UNITS,
      setUnits: (units) => set({ units }),
    }),
    {
      name: 'units',
      storage: createJSONStorage(() => kvStorage),
      partialize: ({ units }) => ({ units }),
    },
  ),
);

// The units to show and type in.
export function useUnits(): Units {
  return useUnitsStore((state) => state.units);
}

// Once someone is signed in, their profile's units win over the phone's, so
// they follow them to any phone. Used in the tabs layout.
export function useSyncProfileUnits() {
  const { data: profile } = useProfile();
  const setUnits = useUnitsStore((state) => state.setUnits);
  const weight = profile?.weight_unit;
  const length = profile?.length_unit;
  const distance = profile?.distance_unit;

  useEffect(() => {
    if (weight && length && distance) setUnits(readUnits({ weight, length, distance }));
  }, [weight, length, distance, setUnits]);
}

// Settings → Preferències: a new unit, used at once (on the phone too) and
// saved to the profile in the background; put back if saving fails.
export function useUpdateUnits() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const setUnits = useUnitsStore((state) => state.setUnits);

  return useMutation({
    mutationFn: (units: Units) => {
      if (!userId) throw new Error('Not signed in.');
      return updateProfileDetails(userId, {
        weight_unit: units.weight,
        length_unit: units.length,
        distance_unit: units.distance,
      });
    },
    onMutate: (units) => {
      const previous = useUnitsStore.getState().units;
      setUnits(units);
      return { previous };
    },
    onError: (error, _units, context) => {
      if (context) setUnits(context.previous);
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('profile.saveError'),
      });
    },
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
  });
}
