import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, IconButton, Text, useToast } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { exerciseName, type Exercise } from './exercise';
import { ExerciseRow } from './ExerciseRow';
import { useArchivedExercises, useRestoreExercise } from './useArchiveExercise';
import { useDeleteExercise } from './useDeleteExercise';

// Plan → Exercicis → Exercicis arxivats: bring an exercise back (US-06),
// or delete it for good from your lists (your history keeps it).
export function ArchivedExercises() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const showToast = useToast();
  const { data: archived, isPending, isError } = useArchivedExercises();
  const restore = useRestoreExercise();
  const deleteExercise = useDeleteExercise();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.loadError')}</Text>;
  if (archived.length === 0) return <Text color="textMuted">{t('exercises.noArchived')}</Text>;

  // Errors (e.g. name taken) are shown by the restore hook itself.
  function restoreExercise(exercise: Exercise) {
    const name = exerciseName(exercise, language);
    restore.mutate(exercise.id, {
      onSuccess: () => showToast({ message: t('exercises.restored', { name }) }),
    });
  }

  return (
    <Card style={styles.list}>
      {archived.map((exercise, index) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          language={language}
          separator={index > 0}
          accessory={
            <View style={styles.actions}>
              <IconButton
                icon="trash"
                label={t('exercises.deleteNamed', { name: exerciseName(exercise, language) })}
                onPress={() => deleteExercise(exercise, { wasArchived: true })}
              />
              <Button
                label={t('exercises.restore')}
                variant="secondary"
                onPress={() => restoreExercise(exercise)}
                disabled={restore.isPending}
              />
            </View>
          }
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  // The rows bring their own padding and hairlines.
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
