import { useState } from 'react';

import { parseSwaps, SWAPS_STORAGE_KEY, withSwap, type Swap, type Swaps } from './swaps';

// Today's swaps, saved on the phone (expo-sqlite's localStorage, like the
// app's language) so they survive closing the app.
export function useSwaps(keepFrom: string) {
  const [swaps, setSwaps] = useState<Swaps>(() =>
    parseSwaps(localStorage.getItem(SWAPS_STORAGE_KEY)),
  );

  function setSwap(date: string, plannedRoutineId: string, swap: Swap | null) {
    const next = withSwap(swaps, date, plannedRoutineId, swap, keepFrom);
    localStorage.setItem(SWAPS_STORAGE_KEY, JSON.stringify(next));
    setSwaps(next);
  }

  return { swaps, setSwap };
}
