import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { upgradeWorkout, type ActiveWorkout, type FinishedWorkout } from './activeWorkout';

type WorkoutState = {
  // The workout being done; only one at a time.
  active: ActiveWorkout | null;
  // Finished but not in the database yet (no signal, or saving failed).
  pending: FinishedWorkout[];
  start: (workout: ActiveWorkout) => void;
  update: (change: (workout: ActiveWorkout) => ActiveWorkout) => void;
  // Moves the active workout to `pending`, to be saved.
  finish: (endedAt: string) => void;
  discard: () => void;
  // Once it's in the database.
  removePending: (id: string) => void;
};

// The live workout (spec: "Offline-safe workout"). Saved on the phone on
// every change (expo-sqlite's key-value store), so it survives the app
// closing or the phone dying, and works with no signal. Zustand rather
// than React state, so the workout screen, Today and the saver share it.
export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
      active: null,
      pending: [],
      start: (workout) => set({ active: workout }),
      update: (change) => set((state) => (state.active ? { active: change(state.active) } : state)),
      finish: (endedAt) =>
        set((state) =>
          state.active
            ? { active: null, pending: [...state.pending, { ...state.active, endedAt }] }
            : state,
        ),
      discard: () => set({ active: null }),
      removePending: (id) =>
        set((state) => ({ pending: state.pending.filter((workout) => workout.id !== id) })),
    }),
    {
      name: 'workout',
      storage: createJSONStorage(() => Storage),
      // Only the data; the functions above aren't saved.
      partialize: ({ active, pending }) => ({ active, pending }),
      // Saved by an older version of the app: bring it up to date. Bump the
      // version whenever ActiveWorkout gains a field.
      version: 1,
      migrate: (saved) => {
        const { active, pending } = saved as Pick<WorkoutState, 'active' | 'pending'>;
        return {
          active: active ? upgradeWorkout(active) : null,
          pending: (pending ?? []).map(upgradeWorkout),
        };
      },
    },
  ),
);
