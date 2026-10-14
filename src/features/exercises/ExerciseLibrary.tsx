import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text, TextField, useToast } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { exerciseName, isCustomExercise, type Exercise } from './exercise';
import { saveErrorReason } from './exerciseDraft';
import { ExerciseRow } from './ExerciseRow';
import { OptionSheet } from './OptionSheet';
import { NO_FILTERS, searchExercises, type ExerciseFilters } from './searchExercises';
import {
  useArchiveExercise,
  useArchivedExercises,
  useRestoreExercise,
} from './useArchiveExercise';
import { useExercises } from './useExercises';
import { useEquipmentGroups, useMuscleGroups } from './useSheetOptions';

type Sheet = 'muscles' | 'equipment';

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
  const showToast = useToast();
  const { data: exercises = [], isPending, isError } = useExercises();
  const { data: archived = [] } = useArchivedExercises();
  const archive = useArchiveExercise();
  const restore = useRestoreExercise();
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);
  // Only offer options that would find something.
  const muscleGroups = useMuscleGroups((muscle) =>
    exercises.some((e) => e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)),
  );
  const equipmentGroups = useEquipmentGroups((item) =>
    exercises.some((e) => e.equipment === item),
  );

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.loadError')}</Text>;

  const results = searchExercises(exercises, filters, language);
  const query = filters.query.trim();
  const hasFilters = query !== '' || filters.muscles.length > 0 || filters.equipment.length > 0;

  const muscleLabels = filters.muscles.map((muscle) => t(`muscles.${muscle}`));
  const equipmentLabels = filters.equipment.map((item) => t(`equipment.${item}`));

  // Archive with an undo toast instead of "Are you sure?" (it's reversible).
  function archiveExercise(exercise: Exercise) {
    const name = exerciseName(exercise, language);
    archive.mutate(exercise.id, {
      onSuccess: () =>
        showToast({
          message: t('exercises.archived', { name }),
          action: {
            label: t('common.undo'),
            onPress: () =>
              restore.mutate(exercise.id, {
                onError: (error) =>
                  showToast({ message: t(`exercises.restoreErrors.${saveErrorReason(error)}`) }),
              }),
          },
        }),
      onError: () => showToast({ message: t('exercises.archiveError') }),
    });
  }

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
      <TextField
        label={t('exercises.search')}
        placeholder={t('exercises.searchPlaceholder')}
        value={filters.query}
        onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      <View style={styles.filterButtons}>
        <FilterButton
          label={muscleLabels.length > 0 ? muscleLabels.join(', ') : t('exercises.allMuscles')}
          active={muscleLabels.length > 0}
          onPress={() => setOpenSheet('muscles')}
        />
        <FilterButton
          label={
            equipmentLabels.length > 0 ? equipmentLabels.join(', ') : t('exercises.allEquipment')
          }
          active={equipmentLabels.length > 0}
          onPress={() => setOpenSheet('equipment')}
        />
      </View>

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
              onPress={() => setFilters(NO_FILTERS)}
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

      <OptionSheet
        visible={openSheet === 'muscles'}
        title={t('exercises.muscleGroup')}
        groups={muscleGroups}
        selected={filters.muscles}
        onToggle={(muscle) =>
          setFilters((current) => ({ ...current, muscles: toggle(current.muscles, muscle) }))
        }
        clear={{
          label: t('exercises.clearFilters'),
          onPress: () => setFilters((current) => ({ ...current, muscles: [] })),
        }}
        doneLabel={t('exercises.showResults', { count: results.length })}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'equipment'}
        title={t('exercises.equipment')}
        groups={equipmentGroups}
        selected={filters.equipment}
        onToggle={(item) =>
          setFilters((current) => ({ ...current, equipment: toggle(current.equipment, item) }))
        }
        clear={{
          label: t('exercises.clearFilters'),
          onPress: () => setFilters((current) => ({ ...current, equipment: [] })),
        }}
        doneLabel={t('exercises.showResults', { count: results.length })}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

// ⋯ next to your own exercises; opens the actions menu.
function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
      <Text variant="cardTitle" color="textMuted">
        ⋯
      </Text>
    </Pressable>
  );
}

// "Tots els músculs", or the picked ones, e.g. "Glutis, Isquiotibials".
function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      role="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        {
          backgroundColor: active ? colors.accentSoft : colors.surfaceRaised,
          borderColor: active ? colors.accent : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <Text variant="bodyStrong" color={active ? 'accent' : 'text'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  library: {
    gap: spacing.lg,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  menuButton: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
