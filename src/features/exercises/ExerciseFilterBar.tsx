import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { MetalFill, Text, Icon } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, typography, useTheme } from '@/theme';

import type { Exercise } from './exercise';
import { OptionGrid, OptionSheetFrame } from './OptionSheet';
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
  // All the exercises being searched, to say how many there are and to
  // only offer filters that find something.
  exercises: readonly Exercise[];
  search: ReturnType<typeof useExerciseSearch>;
  // The "+": create a new exercise.
  onCreate: () => void;
};

// Drawn at the design's size; the tap areas reach touch.min.
const HEIGHT = 40;
const HIT_SLOP = (touch.min - HEIGHT) / 2;
// The dot, its white ring included.
const DOT = 11;

// One row: the search field ("Cerca entre 82 exercicis"), a button with
// the muscle and equipment filters in one sheet (a dot on it while any are
// picked), and a metal "+" to create an exercise.
export function ExerciseFilterBar({ exercises, search, onCreate }: ExerciseFilterBarProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const { filters, setFilters, results } = search;
  const [filtering, setFiltering] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const muscleGroups = useMuscleGroups((muscle) =>
    exercises.some((e) => e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)),
  );
  const equipmentGroups = useEquipmentGroups((item) =>
    exercises.some((e) => e.equipment === item),
  );
  const picked = filters.muscles.length + filters.equipment.length;

  return (
    <View style={styles.row}>
      {/* The whole pill focuses the field (and a little around it, for a
          full-size tap); not a separate element for VoiceOver. */}
      <Pressable
        accessible={false}
        onPress={() => input.current?.focus()}
        hitSlop={HIT_SLOP}
        style={[styles.search, { backgroundColor: colors.surface, boxShadow: shadows.control }]}>
        <Icon name="magnifyingglass" size={16} weight="light" tintColor={colors.textMuted} />
        <TextInput
          ref={input}
          aria-label={t('exercises.search')}
          placeholder={t('exercises.searchCount', { count: exercises.length })}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          value={filters.query}
          onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[styles.input, { color: colors.text }]}
        />
      </Pressable>

      <Pressable
        role="button"
        aria-label={
          picked > 0 ? t('exercises.filtersActive', { count: picked }) : t('exercises.filters')
        }
        onPress={() => setFiltering(true)}
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [
          styles.round,
          {
            backgroundColor: picked > 0 ? colors.accentSoft : colors.surface,
            boxShadow: shadows.control,
          },
          pressed && styles.pressed,
        ]}>
        <Icon
          name="slider.horizontal.3"
          size={17}
          weight="light"
          tintColor={picked > 0 ? colors.accent : colors.textSecondary}
        />
        {picked > 0 ? (
          <View
            style={[styles.dot, { backgroundColor: colors.accent, borderColor: colors.surface }]}
          />
        ) : null}
      </Pressable>

      <Pressable
        role="button"
        aria-label={t('exercises.create')}
        onPress={onCreate}
        hitSlop={HIT_SLOP}
        style={({ pressed }) => [
          styles.round,
          { boxShadow: shadows.control },
          pressed && styles.pressed,
        ]}>
        <MetalFill borderRadius={HEIGHT / 2} />
        <Icon name="plus" size={18} weight="medium" tintColor={colors.onMetal} />
      </Pressable>

      <OptionSheetFrame
        visible={filtering}
        title={t('exercises.filters')}
        onClose={() => setFiltering(false)}
        doneLabel={t('exercises.showResults', { count: results.length })}
        clear={{
          label: t('exercises.clearFilters'),
          onPress: () => setFilters((current) => ({ ...current, muscles: [], equipment: [] })),
        }}>
        <View style={styles.section}>
          <Text variant="label" color="textMuted" accessibilityRole="header">
            {t('exercises.musclesTitle')}
          </Text>
          <OptionGrid
            groups={muscleGroups}
            selected={filters.muscles}
            onToggle={(muscle) =>
              setFilters((current) => ({ ...current, muscles: toggle(current.muscles, muscle) }))
            }
          />
        </View>
        <View style={styles.section}>
          <Text variant="label" color="textMuted" accessibilityRole="header">
            {t('exercises.equipment')}
          </Text>
          <OptionGrid
            groups={equipmentGroups}
            selected={filters.equipment}
            onToggle={(item) =>
              setFilters((current) => ({ ...current, equipment: toggle(current.equipment, item) }))
            }
          />
        </View>
      </OptionSheetFrame>
    </View>
  );
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  search: {
    flex: 1,
    height: HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderRadius: radius.pill,
  },
  // Only the font and size: a lineHeight would push the text off-centre
  // in iOS inputs.
  input: {
    flex: 1,
    height: HEIGHT,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  round: {
    width: HEIGHT,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // On the filter button's corner while any filter is picked.
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
  },
  section: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
