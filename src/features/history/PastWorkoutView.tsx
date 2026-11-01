import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, GradientText, MenuButton, Text } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { formatDuration } from '@/features/routines/routine';import { formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { formatInput } from '@/features/routines/targets';

import {
  formatSetNumbers,
  pastTotals,
  type PastExercise,
  type PastWorkout,
} from './pastWorkout';
import { useDeleteWorkout, usePastWorkout } from './useHistory';

// History → a workout (US-23, spec: Workout detail): when and how long,
// totals, energy and note, then each exercise with its sets as saved.
// "Edita" opens it in the editor; ⋯ also deletes it, with "Desfés".
export function PastWorkoutView({
  id,
  onEdit,
  onDeleted,
}: {
  id: string;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: workout, isPending, isError } = usePastWorkout(id);

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('history.loadError')}</Text>;
  if (!workout) return <Text color="textMuted">{t('history.notFound')}</Text>;
  return <Details workout={workout} onEdit={onEdit} onDeleted={onDeleted} />;
}

function Details({
  workout,
  onEdit,
  onDeleted,
}: {
  workout: PastWorkout;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const language = useAppLanguage();
  const remove = useDeleteWorkout();
  const totals = pastTotals(workout);
  const name =
    workout.sportName ??
    (workout.sport ? t(`sports.${workout.sport}`) : null) ??
    workout.routineName ??
    t('history.noRoutine');
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });

  const stats = [
    totals.durationS === null ? null : formatDuration(totals.durationS),
    totals.exercises > 0 ? t('history.exercises', { count: totals.exercises }) : null,
    totals.sets > 0 ? t('history.sets', { count: totals.sets }) : null,
    totals.volumeKg > 0 ? `${number.format(totals.volumeKg)} kg` : null,
    totals.distanceM > 0 ? `${number.format(totals.distanceM / 1000)} km` : null,
  ].filter((part) => part !== null);

  function openMenu() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: name,
        options: [t('history.edit'), t('history.delete'), t('common.cancel')],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === 0) onEdit();
        if (index !== 1) return;
        remove.mutate(workout);
        onDeleted();
      },
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.titleRow}>
        <View style={styles.title}>
          <GradientText variant="title" accessibilityRole="header" containerStyle={styles.fit}>
            {name}
          </GradientText>
          <Text color="textMuted">{formatDayTitle(fromDateKey(workout.date), language)}</Text>
        </View>
        <MenuButton label={t('history.menu')} onPress={openMenu} />
      </View>

      {stats.length > 0 ? <Text variant="bodyStrong">{stats.join(' · ')}</Text> : null}
      {workout.energy !== null || workout.notes ? (
        <Card>
          {workout.energy !== null ? (
            <Text>{t('history.energy', { energy: workout.energy })}</Text>
          ) : null}
          {workout.notes ? <Text color="textMuted">{workout.notes}</Text> : null}
        </Card>
      ) : null}

      {workout.exercises.length === 0 ? (
        <Text color="textMuted">{t('history.noExercises')}</Text>
      ) : (
        workout.exercises.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)
      )}
      <Button label={t('history.edit')} onPress={onEdit} />
    </View>
  );
}

function ExerciseCard({ exercise }: { exercise: PastExercise }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const name = exerciseName(exercise.exercise, language);
  const reason = exercise.changeReason
    ? t(`workout.exerciseReasons.${exercise.changeReason}`)
    : null;
  const labels = {
    reps: (count: number) => t('workout.vs.reps', { count }),
    level: t('routines.targets.inputs.level'),
  };

  return (
    // A superset or circuit shows its pink bracket, as in the workout.
    <Card
      style={[
        exercise.change === 'skipped' && styles.skipped,
        exercise.groupKey !== null && { borderLeftWidth: 3, borderLeftColor: colors.accent },
      ]}>
      <View style={styles.exerciseTitle}>
        <ExercisePicture exercise={exercise.exercise} size={32} />
        <Text variant="bodyStrong" style={styles.name} accessibilityRole="header">
          {name}
        </Text>
      </View>
      {exercise.change === 'skipped' ? (
        <Text color="textMuted">{[t('workout.skipped'), reason].filter(Boolean).join(' · ')}</Text>
      ) : null}
      {exercise.replaced ? (
        <Text variant="caption" color="textMuted">
          {[t('workout.insteadOf', { name: exerciseName(exercise.replaced, language) }), reason]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      {exercise.notes ? (
        <Text variant="caption" color="textMuted">
          {exercise.notes}
        </Text>
      ) : null}
      {exercise.sets.map((set, index) => (
        <View key={set.id} style={styles.set}>
          <Text
            variant="bodyStrong"
            color={set.setType === 'drop' ? 'accent' : 'textMuted'}
            style={styles.setNumber}>
            {set.setType === 'drop' ? t('workout.dropShort') : index + 1}
          </Text>
          <Text style={styles.name}>
            {formatSetNumbers(exercise.exercise.trackingType, set.numbers, language, labels)}
          </Text>
          {set.rpe !== null ? (
            <Text variant="caption" color="textMuted">
              {`@${formatInput(set.rpe, language)}`}
            </Text>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  // The gradient fits the name, not the whole width.
  fit: {
    alignSelf: 'flex-start',
  },
  page: {
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  exerciseTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
  },
  skipped: {
    opacity: 0.6,
  },
  set: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  setNumber: {
    width: 28,
    textAlign: 'center',
  },
});
