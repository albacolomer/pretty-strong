import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { WEEKDAYS, type Weekday } from '@/features/routines/routine';
import { radius, spacing, touch, useTheme } from '@/theme';

import { addDays } from './dates';

// How a day looks under its date: rest (nothing), planned (a ring), done
// (a pink dot) or skipped (a grey dot).
export type DayState = 'rest' | 'planned' | 'done' | 'skipped';

type WeekStripProps = {
  // The Monday of the week shown.
  weekStart: Date;
  today: Weekday;
  selected: Weekday;
  // Each day's state and how many routines it has planned.
  dayInfo: (day: Weekday) => { state: DayState; planned: number };
  onSelect: (day: Weekday) => void;
};

// Monday to Sunday with today highlighted and a mark under each day: planned,
// done or skipped (spec: WeekStrip). Tap a day to see its plan.
export function WeekStrip({ weekStart, today, selected, dayInfo, onSelect }: WeekStripProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View role="radiogroup" aria-label={t('today.week')} style={styles.strip}>
      {WEEKDAYS.map((day) => {
        const date = addDays(weekStart, day - 1).getDate();
        const { state, planned } = dayInfo(day);
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
              plan:
                state === 'rest'
                  ? t('today.restShort')
                  : state === 'planned'
                    ? t('today.planned', { count: planned })
                    : t(`today.stripState.${state}`),
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
              style={[
                styles.dot,
                state === 'planned' && { borderColor: colors.accent },
                state === 'done' && { backgroundColor: colors.accent, borderColor: colors.accent },
                state === 'skipped' && {
                  backgroundColor: colors.textMuted,
                  borderColor: colors.textMuted,
                },
              ]}
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
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.75,
  },
});
