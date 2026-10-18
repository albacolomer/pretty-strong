import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { WEEKDAYS, type Weekday } from '@/features/routines/routine';
import { radius, spacing, touch, useTheme } from '@/theme';

import { addDays } from './dates';

type WeekStripProps = {
  // The Monday of the week shown.
  weekStart: Date;
  today: Weekday;
  selected: Weekday;
  // How many routines each day has planned.
  plannedCount: (day: Weekday) => number;
  onSelect: (day: Weekday) => void;
};

// Monday to Sunday with today highlighted and a dot under the days with
// something planned (spec: WeekStrip). Tap a day to see its plan.
export function WeekStrip({ weekStart, today, selected, plannedCount, onSelect }: WeekStripProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View role="radiogroup" aria-label={t('today.week')} style={styles.strip}>
      {WEEKDAYS.map((day) => {
        const date = addDays(weekStart, day - 1).getDate();
        const count = plannedCount(day);
        const isToday = day === today;
        const isSelected = day === selected;
        return (
          <Pressable
            key={day}
            role="radio"
            aria-checked={isSelected}
            aria-label={t('today.stripDay', {
              day: t(`weekdays.long.${day}`),
              date,
              plan: count === 0 ? t('today.restShort') : t('today.planned', { count }),
            })}
            onPress={() => onSelect(day)}
            style={({ pressed }) => [styles.day, pressed && styles.pressed]}>
            <Text variant="caption" color={isToday ? 'accent' : 'textMuted'}>
              {t(`weekdays.short.${day}`)}
            </Text>
            <View
              style={[
                styles.date,
                isToday && { backgroundColor: colors.accent },
                isSelected && !isToday && { borderColor: colors.accent },
              ]}>
              <Text variant="bodyStrong" color={isToday ? 'onAccent' : 'text'}>
                {date}
              </Text>
            </View>
            <View
              style={[styles.dot, { backgroundColor: count > 0 ? colors.accent : 'transparent' }]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const DATE_SIZE = 36;

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    width: touch.min,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  date: {
    width: DATE_SIZE,
    height: DATE_SIZE,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pressed: {
    opacity: 0.75,
  },
});
