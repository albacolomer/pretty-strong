import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { exerciseName, isCustomExercise, type Exercise } from './exercise';
import { ExerciseFilterBar, useExerciseSearch } from './ExerciseFilterBar';
import { ExerciseRow } from './ExerciseRow';
import { useArchivedExercises } from './useArchiveExercise';
import { useArchiveWithUndo } from './useArchiveWithUndo';
import { useExercises } from './useExercises';

// Opens the "new exercise" screen, optionally with a name already filled in.
function openNewExercise(name?: string) {
  router.push({ pathname: '/plan/exercises/new', params: name ? { name } : {} });
}

// Plan → Exercicis: search the library by name and filter by muscles and
// equipment (US-03).
export function ExerciseLibrary() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const { data: exercises = [], isPending, isError } = useExercises();
  const { data: archived = [] } = useArchivedExercises();
  const archiveExercise = useArchiveWithUndo();
  const search = useExerciseSearch(exercises);

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.loadError')}</Text>;

  const { results, query, hasFilters } = search;

  // The native iOS action sheet. Archiving isn't shown as destructive: it
  // can always be undone.
  function openMenu(exercise: Exercise) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: exerciseName(exercise, language),
        options: [t('exercises.menu.archive'), t('common.cancel')],
        cancelButtonIndex: 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === 0) archiveExercise(exercise);
      },
    );
  }

  return (
    <View style={styles.library}>
      <ExerciseFilterBar exercises={exercises} search={search} />

      <Button
        label={t('exercises.create')}
        variant="secondary"
        onPress={() => openNewExercise()}
      />

      <Text variant="caption" color="textMuted">
        {t('exercises.count', { count: results.length })}
      </Text>

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
          {results.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              language={language}
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
    gap: spacing.lg,
  },
  empty: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
