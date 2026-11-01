import type { SFSymbol } from 'expo-symbols';

import type { RoutineLabel } from './routine';

// Each routine type's icon (SF Symbols, iOS's own), in outline to match the
// design's line icons; 'none' for a workout without a routine.
export const ROUTINE_ICONS: Record<RoutineLabel | 'none', SFSymbol> = {
  strength: 'dumbbell',
  run: 'shoe',
  hybrid: 'bolt',
  class: 'person.2',
  custom: 'star',
  none: 'figure.strengthtraining.traditional',
};
