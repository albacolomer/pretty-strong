import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  GradientText,
  GradientView,
  MenuButton,
  SectionHeader,
  Text,
  useActionSheet,
} from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { formatDuration } from '@/features/routines/routine';
import { formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { FEELING_MAX, feelingMood, type Feeling } from '@/features/workout/session';
import { useAppLanguage } from '@/lib/i18n';
import { inset, radius, spacing, useTheme } from '@/theme';

import { formatInput } from '@/features/routines/targets';

import {
  formatSetNumbers,
  pastTotals,
  type PastExercise,
  type PastWorkout,
} from './pastWorkout';
import { useDeleteWorkout, usePastWorkout } from './useHistory';

// History → a workout (US-23, spec: Workout detail): when and how long,
// totals, how it felt and the note, then each exercise with its sets as saved.
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
  const showActionSheet = useActionSheet();
  const language = useAppLanguage();
  const remove = useDeleteWorkout();
  const totals = pastTotals(workout);
  const name =
    workout.eventName ??
    (workout.eventKind ? t(`events.kinds.${workout.eventKind}`) : null) ??
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
    showActionSheet(
      {
        title: name,
        options: [t('history.edit'), t('history.delete'), t('common.cancel')],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
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
      {workout.feeling !== null || workout.notes ? (
        <WrapUp feeling={workout.feeling} notes={workout.notes} />
      ) : null}

      {workout.exercises.length === 0 ? (
        <Text color="textMuted">{t('history.noExercises')}</Text>
      ) : (
        <View style={styles.exercises}>
          <SectionHeader title={t('workout.summary.exercises')} />
          {workout.exercises.map((exercise) => (
            <ExerciseCard key={exercise.id} exercise={exercise} />
          ))}
        </View>
      )}
      <Button label={t('history.edit')} onPress={onEdit} />
    </View>
  );
}

// How it went, in its own tinted panel (not a white card like the
// exercises): "COM ET VAS SENTIR?" with the number big, its word and a bar
// out of 10, then the note as a quote.
function WrapUp({ feeling, notes }: { feeling: Feeling | null; notes: string | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const mood = feeling === null ? null : t(`workout.summary.moods.${feelingMood(feeling)}`);

  return (
    <View style={[styles.wrapUp, { backgroundColor: colors.accentSoft }]}>
      {feeling !== null ? (
        <View
          accessible
          aria-label={t('history.feelingLabel', { value: feeling, mood })}
          style={styles.feeling}>
          <Text variant="label" color="textMuted">
            {t('history.feeling')}
          </Text>
          <View style={styles.readout}>
            <GradientText variant="figure">{String(feeling)}</GradientText>
            <Text variant="caption" color="textMuted" style={styles.outOf}>
              / {FEELING_MAX}
            </Text>
            <Text variant="bodyStrong" color="accent" style={styles.mood}>
              {mood}
            </Text>
          </View>
          <View style={[styles.rail, { backgroundColor: colors.track }]}>
            <GradientView
              gradient="bar"
              style={[styles.fill, { width: `${(feeling / FEELING_MAX) * 100}%` }]}
            />
          </View>
        </View>
      ) : null}
      {notes ? (
        <View style={styles.note}>
          <Text variant="label" color="textMuted">
            {t('history.note')}
          </Text>
          <View style={[styles.quote, { borderLeftColor: colors.accent }]}>
            <Text color="textSecondary">{notes}</Text>
          </View>
        </View>
      ) : null}
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
  exercises: {
    gap: spacing.sm,
  },
  // Flat and tinted, so it doesn't read as one more exercise.
  wrapUp: {
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingHorizontal: inset.cardX,
    paddingVertical: inset.cardY,
    gap: spacing.lg,
  },
  feeling: {
    gap: spacing.xs,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  outOf: {
    marginLeft: spacing.xs,
  },
  mood: {
    marginLeft: spacing.md,
  },
  rail: {
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  note: {
    gap: spacing.xs,
  },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
  },
});
