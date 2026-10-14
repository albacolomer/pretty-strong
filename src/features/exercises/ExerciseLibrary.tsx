import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text, TextField } from '@/components/ui';
import { useAppLanguage, type Language } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { EquipmentIcon } from './EquipmentIcon';
import { exerciseName, type Exercise } from './exercise';
import { FilterSheet, type FilterGroup } from './FilterSheet';
import { MuscleFigure } from './MuscleFigure';
import { NO_FILTERS, searchExercises, type ExerciseFilters } from './searchExercises';
import { useExercises } from './useExercises';
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type Muscle } from './vocabulary';

type Sheet = 'muscles' | 'equipment';

// Plan → Exercicis: search the library by name and filter by muscles and
// equipment (US-03).
export function ExerciseLibrary() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { data: exercises, isPending, isError } = useExercises();
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.loadError')}</Text>;

  const results = searchExercises(exercises, filters, language);
  const hasFilters =
    filters.query !== '' || filters.muscles.length > 0 || filters.equipment.length > 0;

  // Only offer options that would find something.
  const muscleGroups: FilterGroup<Muscle>[] = MUSCLE_GROUPS.map((group) => ({
    title: t(`exercises.groups.${group.key}`),
    options: group.muscles
      .filter((muscle) =>
        exercises.some(
          (e) => e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle),
        ),
      )
      .map((muscle) => ({
        value: muscle,
        label: t(`muscles.${muscle}`),
        icon: <MuscleFigure muscle={muscle} />,
      })),
  })).filter((group) => group.options.length > 0);

  const equipmentGroups: FilterGroup<Equipment>[] = [
    {
      options: EQUIPMENT.filter((item) => exercises.some((e) => e.equipment === item)).map(
        (item) => ({
          value: item,
          label: t(`equipment.${item}`),
          icon: <EquipmentIcon equipment={item} color={colors.accent} />,
        }),
      ),
    },
  ];

  const muscleLabels = filters.muscles.map((muscle) => t(`muscles.${muscle}`));
  const equipmentLabels = filters.equipment.map((item) => t(`equipment.${item}`));

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

      <Text variant="caption" color="textMuted">
        {t('exercises.count', { count: results.length })}
      </Text>

      {results.length === 0 ? (
        <View style={styles.empty}>
          <Text color="textMuted">{t('exercises.noResults')}</Text>
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
            <ExerciseRow key={exercise.id} exercise={exercise} language={language} />
          ))}
        </Card>
      )}

      <FilterSheet
        visible={openSheet === 'muscles'}
        title={t('exercises.muscleGroup')}
        groups={muscleGroups}
        selected={filters.muscles}
        onToggle={(muscle) =>
          setFilters((current) => ({ ...current, muscles: toggle(current.muscles, muscle) }))
        }
        onClear={() => setFilters((current) => ({ ...current, muscles: [] }))}
        resultCount={results.length}
        onClose={() => setOpenSheet(null)}
      />
      <FilterSheet
        visible={openSheet === 'equipment'}
        title={t('exercises.equipment')}
        groups={equipmentGroups}
        selected={filters.equipment}
        onToggle={(item) =>
          setFilters((current) => ({ ...current, equipment: toggle(current.equipment, item) }))
        }
        onClear={() => setFilters((current) => ({ ...current, equipment: [] }))}
        resultCount={results.length}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
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

// Name, then its main muscles and equipment, e.g. "Glutis · Barra".
function ExerciseRow({ exercise, language }: { exercise: Exercise; language: Language }) {
  const { t } = useTranslation();
  const details = [
    ...exercise.primaryMuscles.map((muscle) => t(`muscles.${muscle}`)),
    t(`equipment.${exercise.equipment}`),
  ].join(' · ');

  return (
    <View>
      <Text variant="bodyStrong">{exerciseName(exercise, language)}</Text>
      <Text variant="caption" color="textMuted">
        {details}
      </Text>
    </View>
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
  empty: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
