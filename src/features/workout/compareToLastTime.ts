import type { TrackingType } from '@/features/exercises/vocabulary';

import type { SetNumbers } from './activeWorkout';
import { pace } from './cardio';

// "vs last time" (US-14, spec: VsLastTimeBadge): did today's sets beat the
// last time? No React here.

// A run's pace is in seconds per km: less is faster, so better.
export type Change = { unit: 'kg' | 'reps' | 'm' | 's' | 's/km'; amount: number };

export type Comparison = {
  direction: 'up' | 'same' | 'down';
  // What moved, e.g. +2.5 kg; null when it's the same.
  change: Change | null;
};

type Measure = { value: (set: SetNumbers) => number | null; unit: Change['unit'] };

// The best set, by `first`, then by `second` among equals.
function best(sets: SetNumbers[], first: Measure, second?: Measure): SetNumbers | undefined {
  return sets
    .filter((set) => first.value(set) !== null)
    .reduce<SetNumbers | undefined>((top, set) => {
      if (!top) return set;
      const a = first.value(set) ?? 0;
      const b = first.value(top) ?? 0;
      if (a !== b) return a > b ? set : top;
      return (second?.value(set) ?? 0) > (second?.value(top) ?? 0) ? set : top;
    }, undefined);
}

function compareBy(
  done: SetNumbers[],
  last: SetNumbers[],
  first: Measure,
  second?: Measure,
): Comparison | null {
  const today = best(done, first, second);
  const before = best(last, first, second);
  if (!today || !before) return null;
  for (const measure of second ? [first, second] : [first]) {
    const diff = (measure.value(today) ?? 0) - (measure.value(before) ?? 0);
    // Rounded, so 42.5 − 40 is 2.5, not 2.4999.
    const amount = Math.round(diff * 100) / 100;
    if (amount !== 0) {
      return { direction: amount > 0 ? 'up' : 'down', change: { unit: measure.unit, amount } };
    }
  }
  return { direction: 'same', change: null };
}

const weight: Measure = { value: (set) => set.weightKg, unit: 'kg' };
const reps: Measure = { value: (set) => set.reps, unit: 'reps' };
const distance: Measure = { value: (set) => set.distanceM, unit: 'm' };
const time: Measure = { value: (set) => set.durationS, unit: 's' };
// Bodyweight: no added weight is 0 kg, so it still counts as a set.
const addedWeight: Measure = {
  value: (set) => (set.weightKg === null && set.reps === null ? null : (set.weightKg ?? 0)),
  unit: 'kg',
};

// Weights: the heaviest set, then its reps (or distance for carries).
// Bodyweight: the most reps (or the heaviest added weight, when there is
// one). Holds: the longest. Runs: the average pace, faster is better
// (US-19). Cardio machines: none (null), for now.
export function compareToLastTime(
  trackingType: TrackingType,
  done: SetNumbers[],
  last: SetNumbers[],
): Comparison | null {
  switch (trackingType) {
    case 'weight_reps':
      return compareBy(done, last, weight, reps);
    case 'weight_distance':
      return compareBy(done, last, weight, distance);
    case 'bodyweight_reps': {
      const weighted = [...done, ...last].some((set) => (set.weightKg ?? 0) > 0);
      return weighted ? compareBy(done, last, addedWeight, reps) : compareBy(done, last, reps);
    }
    case 'duration':
      return compareBy(done, last, time);
    case 'run': {
      const today = pace(done);
      const before = pace(last);
      if (today === null || before === null) return null;
      const amount = today - before;
      if (amount === 0) return { direction: 'same', change: null };
      return { direction: amount < 0 ? 'up' : 'down', change: { unit: 's/km', amount } };
    }
    case 'cardio_machine':
      return null;
  }
}
