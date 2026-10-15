import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { isCustomExercise, type Exercise } from './exercise';
import { ExerciseForm } from './ExerciseForm';
import { useExercises } from './useExercises';

// Edit one of your own exercises with the same form used to create it.
// Built-ins can't be edited: they're shared by everyone.
export function EditExercise({
  exerciseId,
  onSaved,
}: {
  exerciseId: string;
  onSaved: (exercise: Exercise) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: exercises, isPending } = useExercises();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  const exercise = exercises?.find((e) => e.id === exerciseId);
  if (!exercise || !isCustomExercise(exercise)) {
    return <Text color="textMuted">{t('exercises.detail.notFound')}</Text>;
  }

  return <ExerciseForm exercise={exercise} onSaved={onSaved} />;
}
