import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, TextField } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import type { Exercise } from './exercise';
import { OptionSheet } from './OptionSheet';
import { NO_FILTERS, searchExercises, type ExerciseFilters } from './searchExercises';
import { useEquipmentGroups, useMuscleGroups } from './useSheetOptions';

// Search state for a list of exercises: what's typed and picked, and what
// it finds. Used by the library and the exercise picker.
export function useExerciseSearch(exercises: readonly Exercise[]) {
  const language = useAppLanguage();
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);

  const query = filters.query.trim();
  return {
    filters,
    setFilters,
    results: searchExercises(exercises, filters, language),
    query,
    hasFilters: query !== '' || filters.muscles.length > 0 || filters.equipment.length > 0,
    clear: () => setFilters(NO_FILTERS),
  };
}

type ExerciseFilterBarProps = {
  // All the exercises being searched, to only offer filters that find something.
  exercises: readonly Exercise[];
  search: ReturnType<typeof useExerciseSearch>;
};

type Sheet = 'muscles' | 'equipment';

// The search field and the "Tots els músculs" / "Tot el material" buttons,
// each opening its sheet of options.
export function ExerciseFilterBar({ exercises, search }: ExerciseFilterBarProps) {
  const { t } = useTranslation();
  const { filters, setFilters, results } = search;
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);
  const muscleGroups = useMuscleGroups((muscle) =>
    exercises.some((e) => e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)),
  );
  const equipmentGroups = useEquipmentGroups((item) =>
    exercises.some((e) => e.equipment === item),
  );

  const muscleLabels = filters.muscles.map((muscle) => t(`muscles.${muscle}`));
  const equipmentLabels = filters.equipment.map((item) => t(`equipment.${item}`));

  return (
    <>
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
    </>
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

const styles = StyleSheet.create({
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
});
