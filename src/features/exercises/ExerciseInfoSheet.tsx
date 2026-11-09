import { useTranslation } from 'react-i18next';

import { Sheet } from '@/components/ui';

import type { Exercise } from './exercise';
import { ExerciseView } from './ExerciseDetail';
import { useExercises } from './useExercises';

type ExerciseInfoSheetProps = {
  // The exercise to show, as the workout knows it; null while closed.
  exercise: Exercise | null;
  onClose: () => void;
};

// An exercise's page over a workout: a sheet, so you never leave the workout.
// The library has its latest tips and video; with no signal, or for an
// exercise no longer in it, the workout's own copy still shows.
export function ExerciseInfoSheet({ exercise, onClose }: ExerciseInfoSheetProps) {
  const { t } = useTranslation();
  const { data: exercises } = useExercises();
  const shown = exercises?.find((e) => e.id === exercise?.id) ?? exercise;

  return (
    <Sheet
      visible={exercise !== null}
      title={t('exercises.detail.title')}
      cancelLabel={t('common.done')}
      onCancel={onClose}>
      {shown ? <ExerciseView exercise={shown} /> : null}
    </Sheet>
  );
}
