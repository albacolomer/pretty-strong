import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  GradientText,
  ScreenTitle,
  SectionHeader,
  Text,
  TextField,
} from '@/components/ui';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { formatDuration } from '@/features/routines/routine';
import { formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { inset, spacing, useTheme } from '@/theme';

import type { ActiveWorkout, WrapUp } from './activeWorkout';
import { FeelingSlider } from './FeelingSlider';
import { SESSION_NOTES_MAX_LENGTH, type Feeling } from './session';
import { VsLastTimeBadge } from './VsLastTimeBadge';
import { useExerciseTitle } from './useExerciseTitle';
import { summarize } from './workoutSummary';

type WorkoutSummaryViewProps = {
  workout: ActiveWorkout;
  // When "Acaba l'entrenament" was tapped: the workout's end.
  endedAt: string;
  onBack: () => void;
  onSave: (wrapUp: WrapUp) => void;
};

type Stat = { label: string; value: string; unit?: string };

// After "Acaba l'entrenament" (US-21, spec: WorkoutSummary), laid out like
// Avui: the day and "BONA FEINA!", the routine, its numbers two by two in
// one card (as on "Tot fet"), what beat last time, "Com t'has sentit?" on a
// line from 0 to 10, and a note; those two optional. Nothing is saved
// until "Desa"; "Torna" goes back to the workout.
export function WorkoutSummaryView({ workout, endedAt, onBack, onSave }: WorkoutSummaryViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const titleOf = useExerciseTitle();
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [notes, setNotes] = useState('');
  const summary = summarize(workout, endedAt);
  const kg = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const km = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });

  const stats: Stat[] = [
    { label: t('workout.summary.duration'), value: formatDuration(summary.durationS) },
    // Only when something was lifted (not for a run, say).
    ...(summary.volumeKg > 0
      ? [{ label: t('workout.summary.volume'), value: kg.format(summary.volumeKg), unit: 'kg' }]
      : []),
    // Only after a run or a cardio machine with a distance.
    ...(summary.distanceM > 0
      ? [
          {
            label: t('workout.summary.distance'),
            value: km.format(summary.distanceM / 1000),
            unit: 'km',
          },
        ]
      : []),
    { label: t('workout.summary.sets'), value: String(summary.sets) },
    { label: t('workout.summary.exercises'), value: String(summary.exercises) },
  ];
  // Two to a row.
  const rows = stats.flatMap((stat, index) =>
    index % 2 === 0 ? [stats.slice(index, index + 2)] : [],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        <View style={styles.header}>
          <ScreenTitle
            eyebrow={formatDayTitle(fromDateKey(workout.date), language)}
            title={t('workout.summary.title')}
          />
          {workout.routineName ? (
            <Text variant="cardTitle" color="textSecondary">
              {workout.routineName}
            </Text>
          ) : null}
        </View>

        <Card style={styles.grid}>
          {rows.map((row, index) => (
            <View
              key={row[0].label}
              style={[
                styles.gridRow,
                index > 0 && { borderTopWidth: 1, borderTopColor: colors.separator },
              ]}>
              {row.map((stat, column) => (
                <StatCell key={stat.label} stat={stat} divider={column > 0} />
              ))}
              {/* An odd one out keeps its half of the row. */}
              {row.length === 1 ? <View style={styles.stat} /> : null}
            </View>
          ))}
        </Card>

        {summary.highlights.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title={t('workout.summary.highlights')} />
            <Card style={styles.list}>
              {summary.highlights.map(({ exercise, comparison }, index) => (
                <View
                  key={exercise.id}
                  style={[
                    styles.highlight,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.separator },
                  ]}>
                  <ExercisePicture exercise={exercise.exercise} size={36} />
                  <Text variant="bodyStrong" style={styles.highlightName} numberOfLines={2}>
                    {titleOf(exercise)}
                  </Text>
                  <VsLastTimeBadge comparison={comparison} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        <FeelingSlider value={feeling} onChange={setFeeling} />

        <View style={styles.section}>
          <SectionHeader title={t('workout.summary.notes')} />
          <TextField
            label={t('workout.summary.notes')}
            labelHidden
            placeholder={t('workout.summary.notesPlaceholder')}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={SESSION_NOTES_MAX_LENGTH}
            style={styles.notes}
          />
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.separator, paddingBottom: insets.bottom + spacing.sm },
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
          onPress={() => onSave({ feeling, notes: notes.trim() === '' ? null : notes.trim() })}
          style={styles.footerButton}
        />
      </View>
    </View>
  );
}

// "DURADA" over "1 h 05 min", "KG ALÇATS" over "4.250 kg".
function StatCell({ stat, divider }: { stat: Stat; divider: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      accessible
      aria-label={t('workout.summary.stat', {
        label: stat.label,
        value: [stat.value, stat.unit].filter(Boolean).join(' '),
      })}
      style={[styles.stat, divider && { borderLeftWidth: 1, borderLeftColor: colors.separator }]}>
      <Text variant="label" color="textMuted">
        {stat.label}
      </Text>
      <View style={styles.figure}>
        <GradientText variant="figure">{stat.value}</GradientText>
        {stat.unit ? (
          <Text variant="caption" color="textMuted">
            {' '}
            {stat.unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  grid: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  gridRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: inset.cardX,
    paddingVertical: inset.cardY,
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  section: {
    gap: spacing.sm,
  },
  list: {
    paddingVertical: 0,
    gap: 0,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  highlightName: {
    flex: 1,
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
});
