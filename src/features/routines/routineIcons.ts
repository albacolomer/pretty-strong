import type { SFSymbol } from 'expo-symbols';

import type { RoutineLabel } from './routine';

// Each routine type's icon (SF Symbols, iOS's own); 'none' for a workout
// without a routine.
export const ROUTINE_ICONS: Record<RoutineLabel | 'none', SFSymbol> = {
  strength: 'dumbbell.fill',
  run: 'figure.run',
  hybrid: 'bolt.fill',
  class: 'person.2.fill',
  custom: 'star.fill',
  none: 'figure.strengthtraining.traditional',
};
