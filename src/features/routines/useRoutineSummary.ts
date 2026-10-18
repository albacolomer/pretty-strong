import { useTranslation } from 'react-i18next';

import { exerciseName } from '@/features/exercises/exercise';
import { useAppLanguage } from '@/lib/i18n';

import { formatDuration, usesExercises, usesPlannedDuration, type Routine } from './routine';
import { runBlockKind, runBlockSummary } from './runBlocks';

// How many exercise names a summary shows before "…".
const PREVIEW_COUNT = 3;

// A routine in one line, e.g. "Dl, Dj · 1 h · 4 exercicis · Tracció al pit,
// Rem assegut, Face pull…". A run lists its blocks ("2 blocs · 6 × 400 m,
// 2 km"); a class shows only its duration. Empty when there's nothing to say.
export function useRoutineSummary(routine: Routine, { withDays }: { withDays: boolean }): string {
  const { t } = useTranslation();
  const language = useAppLanguage();

  const isRun = routine.label === 'run';
  // A run's blocks are all the run exercise: describe them, e.g. "6 × 400 m".
  const names = routine.exercises.map((item) =>
    isRun
      ? runBlockSummary(runBlockKind(item.sets), item.sets, language)
      : exerciseName(item.exercise, language),
  );
  const preview =
    names.slice(0, PREVIEW_COUNT).join(', ') + (names.length > PREVIEW_COUNT ? '…' : '');
  const count = isRun
    ? t('routines.blockCount', { count: names.length })
    : t('routines.exerciseCount', { count: names.length });
  const exercises = names.length === 0 ? t('routines.noExercises') : `${count} · ${preview}`;

  return [
    withDays && routine.weekdays.length > 0
      ? routine.weekdays.map((day) => t(`weekdays.short.${day}`)).join(', ')
      : null,
    usesPlannedDuration(routine.label) && routine.plannedDurationS !== null
      ? formatDuration(routine.plannedDurationS)
      : null,
    usesExercises(routine.label) ? exercises : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');
}
