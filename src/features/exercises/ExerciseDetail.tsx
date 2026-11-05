import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  GradientText,
  SettingsCard,
  SettingsRow,
  Text,
} from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { exerciseName, isCustomExercise } from './exercise';
import { linkHost } from './exerciseDraft';
import { ExercisePicture } from './ExerciseRow';
import { ExerciseSettingsEditor } from './ExerciseSettingsEditor';
import { MuscleFigure } from './MuscleFigure';
import { useArchiveWithUndo } from './useArchiveWithUndo';
import { useDeleteExercise } from './useDeleteExercise';
import { useExercises } from './useExercises';
import type { Muscle } from './vocabulary';

type ExerciseDetailProps = {
  exerciseId: string;
  // Opens the edit screen (your own exercises only).
  onEdit: () => void;
  // Called when the exercise is archived or deleted from here, e.g. to go back.
  onRemoved: () => void;
};

const PICTURE_SIZE = 200;

// Plan → Exercicis → an exercise (US-05): what it is and trains.
export function ExerciseDetail({ exerciseId, onEdit, onRemoved }: ExerciseDetailProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { data: exercises, isPending } = useExercises();
  const archiveExercise = useArchiveWithUndo();
  const deleteExercise = useDeleteExercise();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  const exercise = exercises?.find((e) => e.id === exerciseId);
  if (!exercise) return <Text color="textMuted">{t('exercises.detail.notFound')}</Text>;

  return (
    <View style={styles.detail}>
      <View style={styles.header}>
        <ExercisePicture exercise={exercise} size={PICTURE_SIZE} />
        <GradientText variant="title" accessibilityRole="header" style={styles.centered}>
          {exerciseName(exercise, language)}
        </GradientText>
      </View>

      <Card>
        <Fact
          label={t('exercises.detail.tracking')}
          value={`${t(`trackingTypes.${exercise.trackingType}.label`)} · ${t(`trackingTypes.${exercise.trackingType}.detail`)}`}
        />
        <Fact label={t('exercises.equipment')} value={t(`equipment.${exercise.equipment}`)} />
        {exercise.isUnilateral ? (
          <Fact label={t('exercises.form.unilateral')} value={t('exercises.form.unilateralHint')} />
        ) : null}
      </Card>

      {exercise.videoUrl ? <VideoRow url={exercise.videoUrl} /> : null}

      <MuscleList title={t('exercises.detail.primaryMuscles')} muscles={exercise.primaryMuscles} />
      <MuscleList
        title={t('exercises.detail.secondaryMuscles')}
        muscles={exercise.secondaryMuscles}
      />

      <ExerciseSettingsEditor exerciseId={exercise.id} />

      {/* Only your own exercises can be changed, archived or deleted; built-ins are shared. */}
      {isCustomExercise(exercise) ? (
        <View style={styles.actions}>
          <Button label={t('exercises.detail.edit')} variant="secondary" onPress={onEdit} />
          {/* Side by side: Arxiva, and Esborra in red. */}
          <View style={styles.removeActions}>
            <Button
              label={t('exercises.menu.archive')}
              aria-label={t('exercises.detail.archive')}
              variant="secondary"
              onPress={() => {
                onRemoved();
                archiveExercise(exercise);
              }}
              style={styles.removeAction}
            />
            <Button
              label={t('exercises.menu.delete')}
              aria-label={t('exercises.detail.delete')}
              variant="danger"
              onPress={() => deleteExercise(exercise, { wasArchived: false, onDeleted: onRemoved })}
              style={styles.removeAction}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

// The technique video, opened where it lives: the YouTube or TikTok app,
// or Safari. Playing it inside the app comes with US-27.
function VideoRow({ url }: { url: string }) {
  const { t } = useTranslation();
  const site = linkHost(url);

  return (
    <SettingsCard>
      <SettingsRow
        icon="play.rectangle"
        label={t('exercises.detail.video')}
        value={site}
        onPress={() => {
          Linking.openURL(url).catch(() => {});
        }}
        aria-label={t('exercises.detail.watchVideo', { site })}
      />
    </SettingsCard>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

// Each muscle with its little body figure; nothing when there are none.
function MuscleList({ title, muscles }: { title: string; muscles: readonly Muscle[] }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  if (muscles.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="caption" color="textMuted">
        {title}
      </Text>
      <View style={styles.muscles}>
        {muscles.map((muscle) => (
          <View key={muscle} style={styles.muscle}>
            <View style={[styles.figure, { backgroundColor: colors.surfaceRaised }]}>
              <MuscleFigure muscle={muscle} height={44} />
            </View>
            <Text>{t(`muscles.${muscle}`)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const FIGURE_SIZE = 48;

const styles = StyleSheet.create({
  detail: {
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  centered: {
    textAlign: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  removeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  removeAction: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  muscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  muscle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  figure: {
    width: FIGURE_SIZE,
    height: FIGURE_SIZE,
    borderRadius: FIGURE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
