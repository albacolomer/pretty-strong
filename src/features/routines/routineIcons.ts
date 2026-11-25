import type { IconName } from '@/components/ui';

import type { RoutineLabel } from './routine';

// Each routine type's icon (see components/ui/Icon), in outline to match the
// design's line icons; 'none' for a workout without a routine.
export const ROUTINE_ICONS: Record<RoutineLabel | 'none', IconName> = {
  strength: 'dumbbell',
  run: 'shoe',
  hybrid: 'bolt',
  class: 'person.2',
  custom: 'star',
  none: 'figure.strengthtraining.traditional',
};
