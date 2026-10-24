import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { touch } from '@/theme';

import { addDays, dateKey, formatDayTitle, fromDateKey } from './dates';

// ‹ Dimarts, 20 d'octubre ›: a past day, up to `latest` (usually today),
// e.g. when a workout or a weight was done.
export function DayStepper({
  date,
  latest,
  onChange,
}: {
  date: string;
  latest: string;
  onChange: (date: string) => void;
}) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const day = fromDateKey(date);
  const atLatest = date >= latest;

  return (
    <View style={styles.day}>
      <DayButton
        symbol="‹"
        label={t('history.previousDay')}
        onPress={() => onChange(dateKey(addDays(day, -1)))}
      />
      <Text variant="cardTitle" style={styles.dayTitle} accessibilityRole="header">
        {formatDayTitle(day, language)}
      </Text>
      <DayButton
        symbol="›"
        label={t('history.nextDay')}
        disabled={atLatest}
        onPress={() => onChange(dateKey(addDays(day, 1)))}
      />
    </View>
  );
}

function DayButton({
  symbol,
  label,
  onPress,
  disabled = false,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.dayButton, (pressed || disabled) && styles.dimmed]}>
      <Text variant="title" color={disabled ? 'textMuted' : 'accent'}>
        {symbol}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  day: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTitle: {
    flex: 1,
    textAlign: 'center',
  },
  dayButton: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.5,
  },
});
