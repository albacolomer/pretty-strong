import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

import { RestField } from './RestField';
import type { GroupKind } from './RoutineExerciseCard';

type ExerciseGroupProps = {
  kind: GroupKind;
  // Its exercises' number of sets, which is the same for all of them.
  rounds: number;
  restS: number | null;
  // The last exercise's own rest: the rest comes after it, at the round's end.
  exerciseRestS: number;
  onRestChange: (restS: number) => void;
  // The group's exercise cards, in order.
  children: ReactNode;
};

// A superset or circuit in the routine editor (US-08): a pink bracket
// joining its exercises, with their rounds and the rest they share. A set
// added to (or taken from) one exercise is a round for all of them.
export function ExerciseGroup({
  kind,
  rounds,
  restS,
  exerciseRestS,
  onRestChange,
  children,
}: ExerciseGroupProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.bracket, { borderLeftColor: colors.accent }]}>
      <Card>
        <View style={styles.row}>
          <Text variant="bodyStrong" color="accent" accessibilityRole="header">
            {t(`routines.group.${kind}`)}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('routines.group.roundsValue', { count: rounds })}
          </Text>
        </View>
        <Text variant="caption" color="textMuted">
          {t('routines.group.hint')}
        </Text>
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
