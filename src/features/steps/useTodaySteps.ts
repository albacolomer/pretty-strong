import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export type TodaySteps =
  | { status: 'loading' }
  // No step counter (e.g. an iPad), or it failed: the card hides.
  | { status: 'unavailable' }
  // Motion & Fitness not asked yet: the card offers to ask.
  | { status: 'ask' }
  // Said no: only Settings can change it now.
  | { status: 'denied' }
  | { status: 'ready'; steps: number };

// The iPhone's step count since midnight (Motion & Fitness, not Apple
// Health). What the phone counted earlier comes from getStepCountAsync; new
// steps arrive through watchStepCount, which only counts from the moment it
// starts. Neither runs in the background, so both start again whenever the
// app comes back to the front, or the day changes.
export function useTodaySteps(today: Date): { steps: TodaySteps; ask: () => void } {
  const [steps, setSteps] = useState<TodaySteps>({ status: 'loading' });
  // Bumped to read everything again: back to the front, or after asking.
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setReload((count) => count + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let watching: { remove: () => void } | null = null;

    async function load() {
      if (!(await Pedometer.isAvailableAsync())) {
        if (!cancelled) setSteps({ status: 'unavailable' });
        return;
      }
      const permission = await Pedometer.getPermissionsAsync();
      if (!permission.granted) {
        if (!cancelled) setSteps({ status: permission.canAskAgain ? 'ask' : 'denied' });
        return;
      }
      const { steps: before } = await Pedometer.getStepCountAsync(today, new Date());
      if (cancelled) return;
      setSteps({ status: 'ready', steps: before });
      watching = Pedometer.watchStepCount((result) =>
        setSteps({ status: 'ready', steps: before + result.steps }),
      );
    }

    load().catch(() => {
      if (!cancelled) setSteps({ status: 'unavailable' });
    });
    return () => {
      cancelled = true;
      watching?.remove();
    };
  }, [today, reload]);

  // iOS asks once; after that, the answer lives in Settings.
  function ask() {
    void Pedometer.requestPermissionsAsync().then(() => setReload((count) => count + 1));
  }

  return { steps, ask };
}
