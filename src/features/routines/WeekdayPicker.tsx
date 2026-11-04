import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { MetalFill, Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { WEEKDAYS, type Weekday } from './routine';

type WeekdayPickerProps = {
  selected: readonly Weekday[];
  onToggle: (day: Weekday) => void;
};

// Monday to Sunday as seven round toggles (US-09): the days you do this routine.
// Any number, or none. Chosen days are brushed metal.
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
            hitSlop={DAY_SLOP}
            style={({ pressed }) => [
              styles.day,
              { backgroundColor: colors.surfaceRaised },
              pressed && styles.pressed,
            ]}>
            {on ? <MetalFill borderRadius={radius.pill} /> : null}
            <Text variant="bodyStrong" color={on ? 'onMetal' : 'text'}>
              {t(`weekdays.short.${day}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Inside a card, seven days share about 320 pt, so each is about 42 pt
// across: a little more above and below makes each tap 48 pt high.
const DAY_SLOP = { top: 3, bottom: 3 };

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  // As wide as fits, up to 48 pt, and round.
  day: {
    flex: 1,
    maxWidth: touch.min,
    aspectRatio: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
