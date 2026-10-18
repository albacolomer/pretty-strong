import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Stepper, Text } from '@/components/ui';
import { adjustRest, formatRest, REST_MAX_S, REST_STEP_S } from '@/features/exercises/rest';
import { spacing } from '@/theme';

import { PLANNED_SETS_MAX, PLANNED_SETS_MIN } from './routine';

type SetsAndRestProps = {
  plannedSets: number;
  // Null: follows the exercise's own rest.
  restS: number | null;
  // The exercise's own default rest (yours from its detail screen, or the
  // app's), shown while the routine doesn't set one.
  exerciseRestS: number;
  onSetsChange: (sets: number) => void;
  onRestChange: (restS: number | null) => void;
  // A superset or circuit: sets are rounds, and rest comes after each round.
  rounds?: boolean;
};

// The planned sets (or rounds) and rest steppers of the routine editor.
export function SetsAndRest({
  plannedSets,
  restS,
  exerciseRestS,
  onSetsChange,
  onRestChange,
  rounds = false,
}: SetsAndRestProps) {
  const { t } = useTranslation();
  const rest = restS ?? exerciseRestS;
  const sets = rounds
    ? {
        label: t('routines.group.rounds'),
        value: t('routines.group.roundsValue', { count: plannedSets }),
        minus: t('routines.group.roundsMinus'),
        plus: t('routines.group.roundsPlus'),
      }
    : {
        label: t('routines.editor.sets'),
        value: t('routines.editor.setsValue', { count: plannedSets }),
        minus: t('routines.editor.setsMinus'),
        plus: t('routines.editor.setsPlus'),
      };

  return (
    <>
      <View style={styles.controls}>
        <View style={styles.control}>
          <Text variant="caption" color="textMuted">
            {sets.label}
          </Text>
          <Stepper
            value={String(plannedSets)}
            valueLabel={sets.value}
            onDecrement={() => onSetsChange(plannedSets - 1)}
            onIncrement={() => onSetsChange(plannedSets + 1)}
            decrementLabel={sets.minus}
            incrementLabel={sets.plus}
            canDecrement={plannedSets > PLANNED_SETS_MIN}
            canIncrement={plannedSets < PLANNED_SETS_MAX}
          />
        </View>
        <View style={styles.control}>
          <Text variant="caption" color="textMuted">
            {rounds ? t('routines.group.rest') : t('routines.editor.rest')}
          </Text>
          <Stepper
            value={formatRest(rest)}
            valueLabel={t('routines.editor.restValue', { time: formatRest(rest) })}
            // Grey while it follows the exercise's own rest.
            muted={restS === null}
            onDecrement={() => onRestChange(adjustRest(rest, -REST_STEP_S))}
            onIncrement={() => onRestChange(adjustRest(rest, REST_STEP_S))}
            decrementLabel={t('routines.editor.restMinus')}
            incrementLabel={t('routines.editor.restPlus')}
            canDecrement={rest > 0}
            canIncrement={rest < REST_MAX_S}
          />
        </View>
      </View>

      {restS === null ? (
        <Text variant="caption" color="textMuted">
          {t('routines.editor.restFromExercise')}
        </Text>
      ) : (
        <Button
          label={t('routines.editor.useExerciseRest')}
          variant="ghost"
          onPress={() => onRestChange(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  control: {
    gap: spacing.xs,
  },
});
