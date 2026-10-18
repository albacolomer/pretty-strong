import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { WEEKDAYS, type Weekday } from './routine';

type WeekdayPickerProps = {
  selected: readonly Weekday[];
  onToggle: (day: Weekday) => void;
};

// Monday to Sunday as seven toggles (US-09): the days you do this routine.
// Any number, or none.
export function WeekdayPicker({ selected, onToggle }: WeekdayPickerProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {WEEKDAYS.map((day) => {
        const on = selected.includes(day);
        return (
          <Pressable
            key={day}
            role="checkbox"
            aria-checked={on}
            aria-label={t(`weekdays.long.${day}`)}
            onPress={() => onToggle(day)}
            style={({ pressed }) => [
              styles.day,
              { backgroundColor: on ? colors.accent : colors.surfaceRaised },
              pressed && styles.pressed,
            ]}>
            <Text variant="bodyStrong" color={on ? 'onAccent' : 'text'}>
              {t(`weekdays.short.${day}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  day: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
