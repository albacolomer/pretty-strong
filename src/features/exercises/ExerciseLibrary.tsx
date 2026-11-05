import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text, useActionSheet } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { gaps, spacing, useTheme } from '@/theme';

import { exerciseName, isCustomExercise, type Exercise } from './exercise';
import { ExerciseFilterBar, useExerciseSearch } from './ExerciseFilterBar';
import { ExerciseRow } from './ExerciseRow';
import { useArchivedExercises } from './useArchiveExercise';
import { useArchiveWithUndo } from './useArchiveWithUndo';
import { useDeleteExercise } from './useDeleteExercise';
import { useExercises } from './useExercises';

// Opens the "new exercise" screen, optionally with a name already filled in.
function openNewExercise(name?: string) {
  router.push({ pathname: '/plan/exercises/new', params: name ? { name } : {} });
}

// Plan → Exercicis: search the library by name and filter by muscles and
// equipment (US-03).
export function ExerciseLibrary() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const language = useAppLanguage();
  const { data: exercises = [], isPending, isError } = useExercises();
  const { data: archived = [] } = useArchivedExercises();
  const archiveExercise = useArchiveWithUndo();
  const deleteExercise = useDeleteExercise();
  const search = useExerciseSearch(exercises);

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.loadError')}</Text>;

  const { results, query, hasFilters } = search;

  // The native iOS action sheet. Archiving isn't shown as destructive: it
  // can always be undone. Deleting can too, but shows red, as it hides the
  // exercise for good from your lists.
  function openMenu(exercise: Exercise) {
    showActionSheet(
      {
        title: exerciseName(exercise, language),
        options: [t('exercises.menu.archive'), t('exercises.menu.delete'), t('common.cancel')],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) archiveExercise(exercise);
        if (index === 1) deleteExercise(exercise, { wasArchived: false });
      },
    );
  }

  return (
    <View style={styles.library}>
      <ExerciseFilterBar exercises={exercises} search={search} onCreate={() => openNewExercise()} />

      {/* How many it finds, while searching or filtering (the field says
          how many there are in all). */}
      {hasFilters ? (
        <Text variant="caption" color="textMuted">
          {t('exercises.count', { count: results.length })}
        </Text>
      ) : null}

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text color="textMuted">{t('exercises.noResults')}</Text>
          {query !== '' ? (
            // Not in the library? Create it with the searched name.
            <Button
              label={t('exercises.createNamed', { name: query })}
              onPress={() => openNewExercise(query)}
            />
          ) : null}
          {hasFilters ? (
            <Button
              label={t('exercises.clearFilters')}
              variant="secondary"
              onPress={search.clear}
            />
          ) : null}
        </View>
      ) : (
        <Card style={styles.list}>
          {results.map((exercise, index) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              language={language}
              separator={index > 0}
              onPress={() =>
                router.push({ pathname: '/plan/exercises/[id]', params: { id: exercise.id } })
              }
              // Only your own exercises can be archived; built-ins are shared.
              accessory={
                isCustomExercise(exercise) ? (
                  <MenuButton
                    label={t('exercises.menu.label', { name: exerciseName(exercise, language) })}
                    onPress={() => openMenu(exercise)}
                  />
                ) : null
              }
            />
          ))}
        </Card>
      )}

      {archived.length > 0 ? (
        <Button
          label={t('exercises.archivedLink', { count: archived.length })}
          variant="ghost"
          onPress={() => router.push('/plan/exercises/archived')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  library: {
    gap: gaps.loose,
  },
  empty: {
    gap: spacing.md,
  },
  // The rows bring their own padding and hairlines.
  list: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 0,
  },
});
