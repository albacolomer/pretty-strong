import type { Language } from '@/lib/i18n';

import { formatDuration, type ExerciseTargets } from './routine';
import { formatInput, type TargetInput } from './targets';

// Run routines are built from blocks (spec: "Routine types"): Distància
// (10 km), Temps (45 min) or Sèries (6 × 400 m with recovery). Each block
// is a routine exercise of the built-in run exercise, so logging treats it
// like any other: Sèries are that many sets, all with the same numbers, and
// the kind follows from them. No React here.

export const RUN_BLOCK_KINDS = ['distance', 'time', 'intervals'] as const;
export type RunBlockKind = (typeof RUN_BLOCK_KINDS)[number];

// The built-in exercise blocks are made of (supabase/seed.sql).
export const RUN_EXERCISE_SLUG = 'run';

export const INTERVALS_MIN = 2;
export const DEFAULT_INTERVALS = 6;
export const DEFAULT_RECOVERY_S = 90;

// A block's sets: one, or one per repetition, all alike.
type BlockSets = readonly ExerciseTargets[];

// Repetitions make intervals; a time without a distance is a time block;
// anything else is a distance block.
export function runBlockKind(sets: BlockSets): RunBlockKind {
  if (sets.length > 1) return 'intervals';
  const [first] = sets;
  if (first && first.durationS !== null && first.distanceM === null) return 'time';
  return 'distance';
}

// What each block asks for. Intervals are planned per repetition, in
// metres and/or time (400 m, or 1 min, or 400 m in 1:30).
export const RUN_BLOCK_INPUTS: Record<RunBlockKind, readonly TargetInput[]> = {
  distance: ['distanceKm'],
  time: ['minutes', 'seconds'],
  intervals: ['distanceM', 'minutes', 'seconds'],
};

// A block needs its main number, or it couldn't be told apart when the
// routine opens again.
export function isRunBlockComplete(kind: RunBlockKind, targets: ExerciseTargets): boolean {
  if (kind === 'distance') return targets.distanceM !== null;
  if (kind === 'time') return targets.durationS !== null;
  return targets.distanceM !== null || targets.durationS !== null;
}

// A run's whole distance in metres, every repetition of intervals
// counted, e.g. 6 × 400 m and 2 km make 4400. Null unless every block has a
// distance (a time block, or intervals timed only, can't be added up).
export function runDistanceM(blocks: readonly { sets: BlockSets }[]): number | null {
  if (blocks.length === 0) return null;
  let total = 0;
  for (const { sets } of blocks) {
    for (const { distanceM } of sets) {
      if (distanceM === null) return null;
      total += distanceM;
    }
  }
  return total;
}

// "45 min", or "1:30" when there are seconds.
function formatTime(seconds: number): string {
  if (seconds % 60 === 0) return formatDuration(seconds);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

// A short description: "5,5 km", "45 min", "6 × 400 m", "8 × 1:30". Empty
// while the block has no numbers yet.
export function runBlockSummary(kind: RunBlockKind, sets: BlockSets, language: Language): string {
  const { distanceM = null, durationS = null } = sets[0] ?? {};
  if (kind === 'distance') {
    return distanceM === null ? '' : `${formatInput(distanceM / 1000, language)} km`;
  }
  if (kind === 'time') return durationS === null ? '' : formatTime(durationS);
  const each = [
    distanceM === null ? null : `${distanceM} m`,
    durationS === null ? null : formatTime(durationS),
  ]
    .filter((part) => part !== null)
    .join(' · ');
  return each === '' ? '' : `${sets.length} × ${each}`;
}
