import Storage from 'expo-sqlite/kv-store';
import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { METRIC_UNITS, readUnits, type Units } from '@/lib/units';

import { useProfile } from './useProfile';

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
      storage: createJSONStorage(() => Storage),
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
