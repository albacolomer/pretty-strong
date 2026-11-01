import { useTranslation } from 'react-i18next';

import { useAppLanguage } from '@/lib/i18n';

import { formatDuration, usesExercises, usesPlannedDuration, type Routine } from './routine';
import { runDistanceM } from './runBlocks';
import { formatInput } from './targets';

// What's in a routine, as a number: "4 exercicis"; a run's whole distance,
// "4,4 km" (or "3 blocs" when not every block has a distance); a class's
// duration, "45 min". Empty when there's nothing to say.
export function useRoutineSummary(routine: Routine): string {
  const { t } = useTranslation();
  const language = useAppLanguage();

  const count = routine.exercises.length;
  const distanceM = routine.label === 'run' ? runDistanceM(routine.exercises) : null;
  const contents =
    count === 0
      ? t('routines.noExercises')
      : distanceM !== null
        ? `${formatInput(distanceM / 1000, language)} km`
        : routine.label === 'run'
          ? t('routines.blockCount', { count })
          : t('routines.exerciseCount', { count });

  return [
    usesPlannedDuration(routine.label) && routine.plannedDurationS !== null
      ? formatDuration(routine.plannedDurationS)
      : null,
    usesExercises(routine.label) ? contents : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');
}
