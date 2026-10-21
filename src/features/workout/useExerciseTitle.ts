import { useTranslation } from 'react-i18next';

import { exerciseName } from '@/features/exercises/exercise';
import { runBlockSummary } from '@/features/routines/runBlocks';
import { useAppLanguage } from '@/lib/i18n';

import type { ActiveExercise } from './activeWorkout';

// What an exercise is called in the workout: its name, or for a run block
// what the block is ("Sèries · 6 × 400 m"), as every block is the same run
// exercise.
export function useExerciseTitle(): (exercise: ActiveExercise) => string {
  const { t } = useTranslation();
  const language = useAppLanguage();

  return (exercise) => {
    if (!exercise.runBlock) return exerciseName(exercise.exercise, language);
    const { kind, plan } = exercise.runBlock;
    const summary = runBlockSummary(kind, plan, language);
    const kindName = t(`routines.blocks.kinds.${kind}`);
    return summary === '' ? kindName : `${kindName} · ${summary}`;
  };
}
