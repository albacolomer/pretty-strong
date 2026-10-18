import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, touch, useTheme } from '@/theme';

import { WEEKDAYS, type Weekday } from './routine';

type WeekdayPickerProps = {
  selected: readonly Weekday[];
  onToggle: (day: Weekday) => void;
};

// Monday to Sunday as seven round toggles (US-09): the days you do this routine.
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
    justifyContent: 'space-between',
  },
  // Round, 48 pt wide: seven of them still fit an iPhone mini's width.
  day: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
