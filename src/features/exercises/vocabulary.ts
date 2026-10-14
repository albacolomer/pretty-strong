// Fixed codes for exercises. They must match the check constraints in
// supabase/migrations/*_create_exercises.sql. Each code is also the last
// part of its translation key: muscles.<code>, equipment.<code>.
// The order here is the order the filter chips are shown in.

export const MUSCLES = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'lats',
  'upper_back',
  'traps',
  'lower_back',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'hamstrings',
  'adductors',
  'abductors',
  'calves',
] as const;
export type Muscle = (typeof MUSCLES)[number];

// How the muscle filter groups them. Each group key is also the last part
// of its translation key: exercises.groups.<key>.
export const MUSCLE_GROUPS = [
  {
    key: 'upper',
    muscles: ['chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'lats', 'upper_back', 'traps'],
  },
  { key: 'core', muscles: ['abs', 'obliques', 'lower_back'] },
  { key: 'lower', muscles: ['glutes', 'quads', 'hamstrings', 'adductors', 'abductors', 'calves'] },
] as const satisfies readonly { key: string; muscles: readonly Muscle[] }[];

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'cable',
  'smith_machine',
  'band',
  'medicine_ball',
  'sandbag',
  'sled',
  'plate',
  'ski_erg',
  'rower',
  'treadmill',
  'stair_climber',
  'bike',
  'none',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const TRACKING_TYPES = [
  'weight_reps',
  'bodyweight_reps',
  'duration',
  'weight_distance',
  'cardio_machine',
  'run',
] as const;
export type TrackingType = (typeof TRACKING_TYPES)[number];
