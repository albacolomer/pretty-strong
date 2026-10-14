import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Button, Card, Text, useToast } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { exerciseName, type Exercise } from './exercise';
import { saveErrorReason } from './exerciseDraft';
import { ExerciseRow } from './ExerciseRow';
import { useArchivedExercises, useRestoreExercise } from './useArchiveExercise';

// Plan → Exercicis → Exercicis arxivats: bring an exercise back (US-06).
export function ArchivedExercises() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const showToast = useToast();
  const { data: archived, isPending, isError } = useArchivedExercises();
  const restore = useRestoreExercise();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.loadError')}</Text>;
  if (archived.length === 0) return <Text color="textMuted">{t('exercises.noArchived')}</Text>;

  function restoreExercise(exercise: Exercise) {
    const name = exerciseName(exercise, language);
    restore.mutate(exercise.id, {
      onSuccess: () => showToast({ message: t('exercises.restored', { name }) }),
      onError: (error) =>
        showToast({ message: t(`exercises.restoreErrors.${saveErrorReason(error)}`) }),
    });
  }

  return (
    <Card style={styles.list}>
      {archived.map((exercise) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          language={language}
          accessory={
            <Button
              label={t('exercises.restore')}
              variant="secondary"
              onPress={() => restoreExercise(exercise)}
              disabled={restore.isPending}
            />
          }
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
});
