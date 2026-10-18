import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Stepper, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

import { RestField } from './RestField';
import { PLANNED_SETS_MAX, PLANNED_SETS_MIN } from './routine';
import type { GroupKind } from './RoutineExerciseCard';

type ExerciseGroupProps = {
  kind: GroupKind;
  plannedSets: number;
  restS: number | null;
  // The last exercise's own rest: the rest comes after it, at the round's end.
  exerciseRestS: number;
  onSetsChange: (sets: number) => void;
  onRestChange: (restS: number) => void;
  // The group's exercise cards, in order.
  children: ReactNode;
};

// A superset or circuit in the routine editor (US-08): a pink bracket
// joining its exercises, with the rounds and rest they share.
export function ExerciseGroup({
  kind,
  plannedSets,
  restS,
  exerciseRestS,
  onSetsChange,
  onRestChange,
  children,
}: ExerciseGroupProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.bracket, { borderLeftColor: colors.accent }]}>
      <Card>
        <Text variant="bodyStrong" color="accent" accessibilityRole="header">
          {t(`routines.group.${kind}`)}
        </Text>
        <Text variant="caption" color="textMuted">
          {t('routines.group.hint')}
        </Text>
        <View style={styles.row}>
          <Text variant="caption" color="textMuted">
            {t('routines.group.rounds')}
          </Text>
          <Stepper
            value={String(plannedSets)}
            valueLabel={t('routines.group.roundsValue', { count: plannedSets })}
            onDecrement={() => onSetsChange(plannedSets - 1)}
            onIncrement={() => onSetsChange(plannedSets + 1)}
            decrementLabel={t('routines.group.roundsMinus')}
            incrementLabel={t('routines.group.roundsPlus')}
            canDecrement={plannedSets > PLANNED_SETS_MIN}
            canIncrement={plannedSets < PLANNED_SETS_MAX}
          />
        </View>
        <RestField
          label={t('routines.group.rest')}
          value={restS}
          defaultS={exerciseRestS}
          onChange={onRestChange}
          valueLabel={(time) => t('routines.editor.restValue', { time })}
        />
      </Card>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bracket: {
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
