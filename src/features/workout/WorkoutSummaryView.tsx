import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Text, TextField } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { formatDuration } from '@/features/routines/routine';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import type { ActiveWorkout, WrapUp } from './activeWorkout';
import { ENERGY_LEVELS, SESSION_NOTES_MAX_LENGTH, type Energy } from './session';
import { VsLastTimeBadge } from './VsLastTimeBadge';
import { summarize } from './workoutSummary';

type WorkoutSummaryViewProps = {
  workout: ActiveWorkout;
  // When "Acaba l'entrenament" was tapped: the workout's end.
  endedAt: string;
  onBack: () => void;
  onSave: (wrapUp: WrapUp) => void;
};

// After "Acaba l'entrenament" (US-21, spec: WorkoutSummary): how it went
// and what beat last time, then energy and a note, both optional. Nothing
// is saved until "Desa"; "Torna" goes back to the workout.
export function WorkoutSummaryView({ workout, endedAt, onBack, onSave }: WorkoutSummaryViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [notes, setNotes] = useState('');
  const summary = summarize(workout, endedAt);
  const kg = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });

  const stats = [
    { label: t('workout.summary.duration'), value: formatDuration(summary.durationS) },
    { label: t('workout.summary.exercises'), value: String(summary.exercises) },
    { label: t('workout.summary.sets'), value: String(summary.sets) },
    // Only when something was lifted (not for a run, say).
    ...(summary.volumeKg > 0
      ? [{ label: t('workout.summary.volume'), value: `${kg.format(summary.volumeKg)} kg` }]
      : []),
  ];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <View>
          <Text variant="title" accessibilityRole="header">
            {t('workout.summary.title')}
          </Text>
          <Text color="textMuted">{workout.routineName}</Text>
        </View>

        <View style={styles.stats}>
          {stats.map((stat) => (
            <Card
              key={stat.label}
              accessible
              aria-label={t('workout.summary.stat', stat)}
              style={styles.stat}>
              <Text variant="cardTitle">{stat.value}</Text>
              <Text variant="caption" color="textMuted">
                {stat.label}
              </Text>
            </Card>
          ))}
        </View>

        {summary.highlights.length > 0 ? (
          <View style={styles.section}>
            <Text variant="bodyStrong" accessibilityRole="header">
              {t('workout.summary.highlights')}
            </Text>
            <Card style={styles.highlights}>
              {summary.highlights.map(({ exercise, comparison }) => (
                <View key={exercise.id} style={styles.highlight}>
                  <ExercisePicture exercise={exercise.exercise} size={32} />
                  <Text style={styles.highlightName} numberOfLines={2}>
                    {exerciseName(exercise.exercise, language)}
                  </Text>
                  <VsLastTimeBadge comparison={comparison} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="bodyStrong">{t('workout.summary.energy')}</Text>
          <View role="radiogroup" aria-label={t('workout.summary.energy')} style={styles.energyRow}>
            {ENERGY_LEVELS.map((level) => {
              const selected = level === energy;
              return (
                <Pressable
                  key={level}
                  role="radio"
                  aria-checked={selected}
                  aria-label={t('workout.summary.energyLevel', { level })}
                  // Optional, so tapping the chosen one again clears it.
                  onPress={() => setEnergy(selected ? null : level)}
                  style={({ pressed }) => [
                    styles.energy,
                    { backgroundColor: selected ? colors.accent : colors.surfaceRaised },
                    pressed && styles.pressed,
                  ]}>
                  <Text variant="bodyStrong" color={selected ? 'onAccent' : 'text'}>
                    {level}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.energyEnds} aria-hidden>
            <Text variant="caption" color="textMuted">
              {t('workout.summary.energyLow')}
            </Text>
            <Text variant="caption" color="textMuted">
              {t('workout.summary.energyHigh')}
            </Text>
          </View>
        </View>

        <TextField
          label={t('workout.summary.notes')}
          placeholder={t('workout.summary.notesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={SESSION_NOTES_MAX_LENGTH}
          style={styles.notes}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.surfaceRaised, paddingBottom: insets.bottom + spacing.sm },
        ]}>
        <Button
          label={t('workout.summary.back')}
          aria-label={t('workout.summary.backLabel')}
          variant="secondary"
          onPress={onBack}
          style={styles.footerButton}
        />
        <Button
          label={t('workout.summary.save')}
          onPress={() => onSave({ energy, notes: notes.trim() === '' ? null : notes.trim() })}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Two to a row.
  stat: {
    flexBasis: '40%',
    flexGrow: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  highlights: {
    gap: spacing.md,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  highlightName: {
    flex: 1,
  },
  energyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  energy: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notes: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
