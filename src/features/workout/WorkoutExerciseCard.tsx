import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import type { TargetsUpdate } from '@/features/routines/TargetFields';
import { TARGET_INPUTS } from '@/features/routines/targets';
import { useAppLanguage } from '@/lib/i18n';
import { spacing } from '@/theme';

import { shownNumbers, type ActiveExercise } from './activeWorkout';
import { compareToLastTime } from './compareToLastTime';
import { ROW_MAX_INPUTS, SET_INPUT_WIDTH, SetRow } from './SetRow';
import { VsLastTimeBadge } from './VsLastTimeBadge';

type WorkoutExerciseCardProps = {
  exercise: ActiveExercise;
  // The workout's next set to do, outlined.
  nextSetId: string | null;
  onType: (setId: string, update: TargetsUpdate) => void;
  onToggle: (setId: string) => void;
};

// One exercise in the workout (spec: ExerciseCard): picture and name, the
// routine's note on it, then a row per set.
export function WorkoutExerciseCard({
  exercise,
  nextSetId,
  onType,
  onToggle,
}: WorkoutExerciseCardProps) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const name = exerciseName(exercise.exercise, language);
  const inputs = TARGET_INPUTS[exercise.exercise.trackingType];
  const doneSets = exercise.sets.filter((set) => set.completedAt !== null);
  const done = doneSets.length;
  // Once all its sets are done: better, same or less than last time?
  const comparison =
    done === exercise.sets.length && exercise.previous
      ? compareToLastTime(
          exercise.exercise.trackingType,
          doneSets.map(shownNumbers),
          exercise.previous,
        )
      : null;

  return (
    <Card>
      <View style={styles.titleRow}>
        <ExercisePicture exercise={exercise.exercise} size={40} />
        <Text variant="cardTitle" style={styles.name} accessibilityRole="header">
          {name}
        </Text>
        {comparison ? (
          <VsLastTimeBadge comparison={comparison} />
        ) : (
          <Text variant="caption" color="textMuted">
            {t('workout.setsDone', { done, total: exercise.sets.length })}
          </Text>
        )}
      </View>
      {exercise.notes ? (
        <Text variant="caption" color="textMuted">
          {exercise.notes}
        </Text>
      ) : null}

      {inputs.length <= ROW_MAX_INPUTS ? (
        <View style={styles.header} aria-hidden>
          <Text variant="caption" color="textMuted" style={styles.numberColumn}>
            {t('routines.sets.header')}
          </Text>
          {inputs.map((input) => (
            <Text key={input} variant="caption" color="textMuted" style={styles.inputColumn}>
              {t(`routines.targets.inputs.${input}`)}
            </Text>
          ))}
        </View>
      ) : null}

      {exercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          number={index + 1}
          inputs={inputs}
          set={set}
          isNext={set.id === nextSetId}
          exerciseName={name}
          onType={(update) => onType(set.id, update)}
          onToggle={() => onToggle(set.id)}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  numberColumn: {
    width: 24,
    textAlign: 'center',
  },
  inputColumn: {
    width: SET_INPUT_WIDTH,
    textAlign: 'center',
  },
});
