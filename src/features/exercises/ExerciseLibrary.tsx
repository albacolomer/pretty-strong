import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Text, TextField } from '@/components/ui';
import { useAppLanguage, type Language } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { exerciseName, type Exercise } from './exercise';
import { NO_FILTERS, searchExercises, type ExerciseFilters } from './searchExercises';
import { useExercises } from './useExercises';
import { EQUIPMENT, MUSCLES } from './vocabulary';

// Plan → Exercicis: search the library by name and filter by muscle and
// equipment (US-03).
export function ExerciseLibrary() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { data: exercises, isPending, isError } = useExercises();
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.loadError')}</Text>;

  const results = searchExercises(exercises, filters, language);
  // Only offer chips that would find something.
  const muscles = MUSCLES.filter((muscle) =>
    exercises.some(
      (e) => e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle),
    ),
  );
  const equipmentInUse = EQUIPMENT.filter((item) => exercises.some((e) => e.equipment === item));
  const hasFilters = filters.query !== '' || filters.muscle !== null || filters.equipment !== null;

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

      <ChipRow
        label={t('exercises.muscle')}
        options={muscles}
        selected={filters.muscle}
        getLabel={(muscle) => t(`muscles.${muscle}`)}
        onToggle={(muscle) =>
          setFilters((current) => ({
            ...current,
            muscle: current.muscle === muscle ? null : muscle,
          }))
        }
      />
      <ChipRow
        label={t('exercises.equipment')}
        options={equipmentInUse}
        selected={filters.equipment}
        getLabel={(item) => t(`equipment.${item}`)}
        onToggle={(item) =>
          setFilters((current) => ({
            ...current,
            equipment: current.equipment === item ? null : item,
          }))
        }
      />

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
    </View>
  );
}

type ChipRowProps<T extends string> = {
  label: string;
  options: readonly T[];
  selected: T | null;
  getLabel: (option: T) => string;
  onToggle: (option: T) => void;
};

// A labelled, sideways-scrolling row of filter chips; tap again to clear.
function ChipRow<T extends string>({ label, options, selected, getLabel, onToggle }: ChipRowProps<T>) {
  return (
    <View style={styles.chipRow}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option}
            label={getLabel(option)}
            selected={option === selected}
            onPress={() => onToggle(option)}
          />
        ))}
      </ScrollView>
    </View>
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
  chipRow: {
    gap: spacing.xs,
  },
  chips: {
    gap: spacing.sm,
  },
  empty: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
