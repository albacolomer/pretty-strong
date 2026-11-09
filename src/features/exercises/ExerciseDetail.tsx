import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  GradientText,
  SettingsCard,
  SettingsRow,
  Text,
} from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { exerciseName, isCustomExercise, type Exercise } from './exercise';
import { ExercisePicture } from './ExerciseRow';
import { ExerciseSettingsEditor } from './ExerciseSettingsEditor';
import { ExerciseTechnique } from './ExerciseTechnique';
import { useArchiveWithUndo } from './useArchiveWithUndo';
import { useDeleteExercise } from './useDeleteExercise';
import { useExercises } from './useExercises';
import type { Muscle } from './vocabulary';

type ExerciseActions = {
  // Opens the edit screen (your own exercises only).
  onEdit?: () => void;
  // Called when the exercise is archived or deleted from here, e.g. to go
  // back. Left out, those two aren't offered: from a routine that's being
  // edited, or from a workout.
  onRemoved?: () => void;
};

const PICTURE_SIZE = 160;

// Plan → Exercicis → an exercise (US-05): what it is, how to do it, and
// your own settings on it.
export function ExerciseDetail({
  exerciseId,
  ...actions
}: ExerciseActions & { exerciseId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: exercises, isPending } = useExercises();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  const exercise = exercises?.find((e) => e.id === exerciseId);
  if (!exercise) return <Text color="textMuted">{t('exercises.detail.notFound')}</Text>;

  return <ExerciseView exercise={exercise} {...actions} />;
}

// The exercise's page itself, for when you already have the exercise.
export function ExerciseView({
  exercise,
  onEdit,
  onRemoved,
}: ExerciseActions & { exercise: Exercise }) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const archiveExercise = useArchiveWithUndo();
  const deleteExercise = useDeleteExercise();

  return (
    <View style={styles.detail}>
      <View style={styles.header}>
        <ExercisePicture exercise={exercise} size={PICTURE_SIZE} />
        <GradientText variant="title" accessibilityRole="header" style={styles.centered}>
          {exerciseName(exercise, language)}
        </GradientText>
        <Text variant="caption" color="textMuted" style={styles.centered}>
          {`${t(`equipment.${exercise.equipment}`)} · ${t(`trackingTypes.${exercise.trackingType}.detail`)}`}
        </Text>
        {exercise.isUnilateral ? (
          <Text variant="caption" color="textMuted" style={styles.centered}>
            {t('exercises.form.unilateralHint')}
          </Text>
        ) : null}
        <MuscleChips primary={exercise.primaryMuscles} secondary={exercise.secondaryMuscles} />
      </View>

      <ExerciseTechnique exercise={exercise} />
      <ExerciseSettingsEditor exerciseId={exercise.id} />

      {/* Only your own exercises can be changed, archived or deleted; built-ins are shared. */}
      {isCustomExercise(exercise) && (onEdit || onRemoved) ? (
        <SettingsCard>
          {onEdit ? (
            <SettingsRow icon="pencil" label={t('exercises.detail.edit')} onPress={onEdit} />
          ) : null}
          {onRemoved ? (
            <SettingsRow
              icon="archivebox"
              tone="muted"
              label={t('exercises.menu.archive')}
              aria-label={t('exercises.detail.archive')}
              onPress={() => {
                onRemoved();
                archiveExercise(exercise);
              }}
            />
          ) : null}
          {onRemoved ? (
            <SettingsRow
              icon="trash"
              tone="danger"
              label={t('exercises.menu.delete')}
              aria-label={t('exercises.detail.delete')}
              onPress={() => deleteExercise(exercise, { wasArchived: false, onDeleted: onRemoved })}
            />
          ) : null}
        </SettingsCard>
      ) : null}
    </View>
  );
}

// What it trains at a glance: main muscles in blue, the others in grey.
function MuscleChips({
  primary,
  secondary,
}: {
  primary: readonly Muscle[];
  secondary: readonly Muscle[];
}) {
  const { t } = useTranslation();
  if (primary.length === 0 && secondary.length === 0) return null;
  const names = (muscles: readonly Muscle[]) => muscles.map((m) => t(`muscles.${m}`)).join(', ');

  return (
    <View
      accessible
      aria-label={[
        primary.length > 0 ? `${t('exercises.detail.primaryMuscles')}: ${names(primary)}` : '',
        secondary.length > 0 ? `${t('exercises.detail.secondaryMuscles')}: ${names(secondary)}` : '',
      ]
        .filter(Boolean)
        .join('. ')}
      style={styles.chips}>
      {primary.map((muscle) => (
        <MuscleChip key={muscle} muscle={muscle} main />
      ))}
      {secondary.map((muscle) => (
        <MuscleChip key={muscle} muscle={muscle} />
      ))}
    </View>
  );
}

function MuscleChip({ muscle, main = false }: { muscle: Muscle; main?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[styles.chip, { backgroundColor: main ? colors.accentSoft : colors.surfaceRaised }]}>
      <Text variant="caption" color={main ? 'accent' : 'textSecondary'}>
        {t(`muscles.${muscle}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detail: {
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
