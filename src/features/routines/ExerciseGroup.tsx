import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

import type { GroupKind } from './RoutineExerciseCard';
import { SetsAndRest } from './SetsAndRest';

type ExerciseGroupProps = {
  kind: GroupKind;
  plannedSets: number;
  restS: number | null;
  // The last exercise's own rest: the rest comes after it, at the round's end.
  exerciseRestS: number;
  onSetsChange: (sets: number) => void;
  onRestChange: (restS: number | null) => void;
  // The group's exercise cards, in order.
  children: ReactNode;
};

// A superset or circuit in the routine editor (US-08): a pink bracket
// joining its exercises, with the rounds and rest they share.
export function ExerciseGroup({ kind, children, ...sets }: ExerciseGroupProps) {
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
        <SetsAndRest {...sets} rounds />
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
});
