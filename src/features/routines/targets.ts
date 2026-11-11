import type { TrackingType } from '@/features/exercises/vocabulary';
import type { Language } from '@/lib/i18n';

import type { ExerciseTargets } from './routine';

// The first-time plan's input fields: which ones each exercise shows, and
// how typed text becomes the stored number. No React here.

// One number field. Time is two fields (minutes and seconds) stored as one
// number of seconds.
export type TargetInput =
  | 'reps'
  | 'weightKg'
  | 'distanceKm'
  | 'distanceM'
  | 'minutes'
  | 'seconds'
  | 'speedKmh'
  | 'inclinePct'
  | 'level';

// The fields each tracking type asks for, in order (spec: "Tracking types").
// Runs are planned in km, machines and carries in metres.
export const TARGET_INPUTS: Record<TrackingType, readonly TargetInput[]> = {
  weight_reps: ['reps', 'weightKg'],
  bodyweight_reps: ['reps', 'weightKg'],
  duration: ['minutes', 'seconds'],
  // Time only when chosen (see MEASURE_CHOICES).
  weight_distance: ['weightKg', 'distanceM', 'minutes', 'seconds'],
  cardio_machine: ['minutes', 'seconds', 'distanceM', 'speedKmh', 'inclinePct', 'level'],
  run: ['distanceKm', 'minutes', 'seconds'],
};

type InputSpec = {
  // Digits after the decimal separator; 0 shows the keypad without one.
  decimals: number;
  // Shown on screen; the limits match the target_* check constraints.
  min: number;
  max: number;
  // The longest text that can be typed.
  maxLength: number;
};

export const INPUT_SPECS: Record<TargetInput, InputSpec> = {
  reps: { decimals: 0, min: 1, max: 1000, maxLength: 4 },
  weightKg: { decimals: 2, min: 0, max: 1000, maxLength: 7 },
  distanceKm: { decimals: 3, min: 0.001, max: 1000, maxLength: 8 },
  distanceM: { decimals: 0, min: 1, max: 1_000_000, maxLength: 7 },
  minutes: { decimals: 0, min: 0, max: 1440, maxLength: 4 },
  seconds: { decimals: 0, min: 0, max: 59, maxLength: 2 },
  speedKmh: { decimals: 1, min: 0, max: 60, maxLength: 4 },
  inclinePct: { decimals: 1, min: 0, max: 40, maxLength: 4 },
  level: { decimals: 0, min: 1, max: 100, maxLength: 3 },
};

// Catalan and Spanish write 42,5; English 42.5.
export function decimalSeparator(language: Language): string {
  return language === 'en' ? '.' : ',';
}

// Typed text → a number within the field's limits, rounded to its
// decimals. Empty or unreadable text is null. Either separator works.
export function parseInput(input: TargetInput, text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  const { decimals, min, max } = INPUT_SPECS[input];
  const factor = 10 ** decimals;
  return Math.min(max, Math.max(min, Math.round(value * factor) / factor));
}

// A number → the text shown in the field ("" for none).
export function formatInput(value: number | null, language: Language): string {
  return value === null ? '' : String(value).replace('.', decimalSeparator(language));
}

// What a field shows from the stored plan.
export function inputValue(targets: ExerciseTargets, input: TargetInput): number | null {
  switch (input) {
    case 'reps':
      return targets.reps;
    case 'weightKg':
      return targets.weightKg;
    case 'distanceKm':
      return targets.distanceM === null ? null : targets.distanceM / 1000;
    case 'distanceM':
      return targets.distanceM;
    case 'minutes':
      return targets.durationS === null ? null : Math.floor(targets.durationS / 60);
    case 'seconds':
      return targets.durationS === null ? null : targets.durationS % 60;
    case 'speedKmh':
      return targets.speedKmh;
    case 'inclinePct':
      return targets.inclinePct;
    case 'level':
      return targets.level;
  }
}

// The stored plan after a field changes. Minutes and seconds make one
// duration: both empty (or zero) means none.
export function withInput(
  targets: ExerciseTargets,
  input: TargetInput,
  value: number | null,
): ExerciseTargets {
  switch (input) {
    case 'reps':
      return { ...targets, reps: value };
    case 'weightKg':
      return { ...targets, weightKg: value };
    case 'distanceKm':
      return { ...targets, distanceM: value === null ? null : Math.round(value * 1000) };
    case 'distanceM':
      return { ...targets, distanceM: value };
    case 'minutes':
    case 'seconds': {
      const minutes = input === 'minutes' ? value : inputValue(targets, 'minutes');
      const seconds = input === 'seconds' ? value : inputValue(targets, 'seconds');
      const total = (minutes ?? 0) * 60 + (seconds ?? 0);
      return { ...targets, durationS: total === 0 ? null : total };
    }
    case 'speedKmh':
      return { ...targets, speedKmh: value };
    case 'inclinePct':
      return { ...targets, inclinePct: value };
    case 'level':
      return { ...targets, level: value };
  }
}

// What a cardio machine or a carry measures, chosen per exercise in a
// routine (stored in routine_exercises.measures): only those columns show,
// in the editor and in the workout. Time is two fields, minutes and seconds.
export const MEASURES = ['weight', 'distance', 'duration', 'speed', 'incline', 'level'] as const;
export type Measure = (typeof MEASURES)[number];

const MEASURE_INPUTS: Record<Measure, readonly TargetInput[]> = {
  weight: ['weightKg'],
  distance: ['distanceM'],
  duration: ['minutes', 'seconds'],
  speed: ['speedKmh'],
  incline: ['inclinePct'],
  level: ['level'],
};

type MeasureChoice = {
  // Every measure it can have, in the order they show. Any of them can go,
  // as long as one is left: something has to be measured.
  all: readonly Measure[];
  // What a new one starts with.
  defaults: readonly Measure[];
};

// The tracking types whose measures are chosen; the others always show
// all of theirs (TARGET_INPUTS).
export const MEASURE_CHOICES: Partial<Record<TrackingType, MeasureChoice>> = {
  cardio_machine: {
    all: ['duration', 'distance', 'speed', 'incline', 'level'],
    defaults: ['duration'],
  },
  weight_distance: {
    all: ['weight', 'distance', 'duration'],
    defaults: ['weight', 'distance'],
  },
};

// Whether any of these plans or sets has a number for it.
export function measureUsed(measure: Measure, known: readonly ExerciseTargets[]): boolean {
  return known.some((targets) =>
    MEASURE_INPUTS[measure].some((input) => inputValue(targets, input) !== null),
  );
}

// An exercise's measures, in order: as chosen, or (none chosen yet, as for
// routines saved before) its defaults and any its plan already has numbers
// for. Never none: an empty choice counts as not chosen. Empty for a type
// that doesn't choose.
export function measuresOf(
  trackingType: TrackingType,
  chosen: readonly Measure[] | null,
  known: readonly ExerciseTargets[],
): Measure[] {
  const choice = MEASURE_CHOICES[trackingType];
  if (!choice) return [];
  const picked = chosen && chosen.length > 0 ? chosen : null;
  return choice.all.filter((measure) =>
    picked
      ? picked.includes(measure)
      : choice.defaults.includes(measure) || measureUsed(measure, known),
  );
}

// The ones still to add with "+".
export function measuresToAdd(trackingType: TrackingType, shown: readonly Measure[]): Measure[] {
  return (MEASURE_CHOICES[trackingType]?.all ?? []).filter((measure) => !shown.includes(measure));
}

export function measureInputs(measures: readonly Measure[]): TargetInput[] {
  return measures.flatMap((measure) => MEASURE_INPUTS[measure]);
}

// The fields an exercise in a routine shows.
export function routineInputs(
  trackingType: TrackingType,
  chosen: readonly Measure[] | null,
  known: readonly ExerciseTargets[],
): readonly TargetInput[] {
  return MEASURE_CHOICES[trackingType]
    ? measureInputs(measuresOf(trackingType, chosen, known))
    : TARGET_INPUTS[trackingType];
}

// A plan without that measure's numbers, once it's taken off.
export function withoutMeasure(targets: ExerciseTargets, measure: Measure): ExerciseTargets {
  return MEASURE_INPUTS[measure].reduce((next, input) => withInput(next, input, null), targets);
}

// Saved text → measures; anything unknown is dropped.
export function readMeasures(saved: readonly string[] | null): Measure[] | null {
  return saved === null
    ? null
    : saved.filter((item): item is Measure => (MEASURES as readonly string[]).includes(item));
}
