import type { ChangeReason } from '@/features/workout/session';

// "Canvia" on Today: a routine done instead of the planned one, for one day
// (US-12). Kept on the phone until it's marked done (the session then
// records both), so a swap made in the morning is still there in the
// evening. No React here.

export type Swap = {
  routineId: string;
  reason: ChangeReason | null;
};

// By day ("2026-10-20"), then by the planned routine's id.
export type Swaps = Record<string, Record<string, Swap>>;

export const SWAPS_STORAGE_KEY = 'swaps';

// The swaps with one changed (null takes it off), keeping only days from
// `keepFrom` on, so old weeks don't pile up.
export function withSwap(
  swaps: Swaps,
  date: string,
  plannedRoutineId: string,
  swap: Swap | null,
  keepFrom: string,
): Swaps {
  const day = { ...swaps[date] };
  if (swap) day[plannedRoutineId] = swap;
  else delete day[plannedRoutineId];

  const kept = Object.entries({ ...swaps, [date]: day }).filter(
    ([key, value]) => key >= keepFrom && Object.keys(value).length > 0,
  );
  return Object.fromEntries(kept);
}

// What the phone has saved; nothing if it's missing or unreadable.
export function parseSwaps(saved: string | null): Swaps {
  if (!saved) return {};
  try {
    const value: unknown = JSON.parse(saved);
    return value && typeof value === 'object' ? (value as Swaps) : {};
  } catch {
    return {};
  }
}
