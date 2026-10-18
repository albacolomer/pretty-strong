import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

import type { Routine } from './routine';

// The routine's type as a small pink tag: "Força", or a custom type's own
// name, e.g. "Natació".
export function RoutineTypeTag({ routine }: { routine: Pick<Routine, 'label' | 'customLabel'> }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.tag, { backgroundColor: colors.accentSoft }]}>
      <Text variant="caption" color="accent">
        {routine.customLabel ?? t(`routines.labels.${routine.label}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
