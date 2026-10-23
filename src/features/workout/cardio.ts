import { RUN_BLOCK_INPUTS } from '@/features/routines/runBlocks';
import { TARGET_INPUTS, inputValue, type TargetInput } from '@/features/routines/targets';

import type { ActiveExercise, SetNumbers } from './activeWorkout';

// Cardio machines and runs in the workout (US-19, spec flow 6). No React
// here.

// Seconds per km over some sets: their total time over their total
// distance, counting only the sets that have both. Worked out, never
// stored (data rule 2).
export function pace(sets: readonly Pick<SetNumbers, 'distanceM' | 'durationS'>[]): number | null {
  const timed = sets.filter(
    (set) => set.durationS !== null && set.distanceM !== null && set.distanceM > 0,
  );
  const distanceM = timed.reduce((total, set) => total + (set.distanceM ?? 0), 0);
  const durationS = timed.reduce((total, set) => total + (set.durationS ?? 0), 0);
  if (distanceM === 0 || durationS === 0) return null;
  return Math.round(durationS / (distanceM / 1000));
}

// "5:30 /km".
export function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  return `${minutes}:${String(secondsPerKm % 60).padStart(2, '0')} /km`;
}

// A cardio machine's fields besides its time, in the order they show.
const CARDIO_EXTRAS: readonly TargetInput[] = ['distanceM', 'speedKmh', 'inclinePct', 'level'];

// The fields an exercise's rows show. Run intervals are in metres, other
// runs in km; both log the time too, for the pace. A cardio machine shows
// its time and the fields its plan or last time use (a stairmaster: time
// and level), or all of them with nothing to go on, or once asked for
// (allFields).
export function workoutInputs(exercise: ActiveExercise): readonly TargetInput[] {
  if (exercise.runBlock?.kind === 'intervals') return RUN_BLOCK_INPUTS.intervals;
  const all = TARGET_INPUTS[exercise.exercise.trackingType];
  if (exercise.exercise.trackingType !== 'cardio_machine' || exercise.allFields) return all;
  // Not what's typed: a field would vanish while it's being cleared.
  const known = [...exercise.sets.map((set) => set.planned), ...(exercise.previous ?? [])];
  const used = (input: TargetInput) => known.some((numbers) => inputValue(numbers, input) !== null);
  if (!all.some(used)) return all;
  return all.filter((input) => !CARDIO_EXTRAS.includes(input) || used(input));
}
