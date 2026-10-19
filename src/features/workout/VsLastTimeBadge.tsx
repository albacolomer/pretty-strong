import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatInput } from '@/features/routines/targets';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import type { Change, Comparison } from './compareToLastTime';

// "↑ +2,5 kg ✨", "= Igual" or "↓ −1 rep" (spec: VsLastTimeBadge), once an
// exercise's sets are done. A tiny sparkle when you beat last time.
export function VsLastTimeBadge({ comparison }: { comparison: Comparison }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();

  function amount(change: Change): string {
    const value = Math.abs(change.amount);
    if (change.unit === 'reps') return t('workout.vs.reps', { count: value });
    return `${formatInput(value, language)} ${change.unit}`;
  }

  const { direction, change } = comparison;
  const sign = direction === 'up' ? '+' : '−';
  const text =
    direction === 'same' || !change
      ? `= ${t('workout.vs.sameShort')}`
      : `${direction === 'up' ? '↑' : '↓'} ${sign}${amount(change)}${direction === 'up' ? ' ✨' : ''}`;
  const label =
    direction === 'same' || !change
      ? t('workout.vs.same')
      : t(`workout.vs.${direction}`, { change: `${sign}${amount(change)}` });
  const color = direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'textMuted';

  return (
    <View
      aria-label={label}
      style={[styles.badge, { backgroundColor: colors.surfaceRaised }]}>
      <Text variant="caption" color={color}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
});
