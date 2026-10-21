import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { WEEKDAYS } from '@/features/routines/routine';
import { dateKey, formatDayTitle } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { formatMonth, monthWeeks } from './calendar';

type MonthCalendarProps = {
  // The 1st of the month shown.
  month: Date;
  today: Date;
  // "2026-10-20", or null for the whole month.
  selected: string | null;
  // How many workouts each day has, by "2026-10-20".
  workouts: Map<string, number>;
  onSelect: (day: string) => void;
  onMonthChange: (months: -1 | 1) => void;
};

// History's month (US-23): Monday to Sunday, as the week strip draws days:
// today filled pink, the chosen day ringed, a pink dot under each day with
// a workout. ‹ › change month; there's nothing to see after this one.
export function MonthCalendar({
  month,
  today,
  selected,
  workouts,
  onSelect,
  onMonthChange,
}: MonthCalendarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const todayKey = dateKey(today);
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  return (
    <View style={styles.calendar}>
      <View style={styles.header}>
        <MonthButton
          symbol="‹"
          label={t('history.previousMonth')}
          onPress={() => onMonthChange(-1)}
        />
        <Text variant="cardTitle" accessibilityRole="header" style={styles.month}>
          {formatMonth(month, language)}
        </Text>
        <MonthButton
          symbol="›"
          label={t('history.nextMonth')}
          onPress={() => onMonthChange(1)}
          disabled={isCurrentMonth}
        />
      </View>

      <View style={styles.week} aria-hidden>
        {WEEKDAYS.map((day) => (
          <Text key={day} variant="caption" color="textMuted" style={styles.weekday}>
            {t(`weekdays.short.${day}`)}
          </Text>
        ))}
      </View>

      {monthWeeks(month).map((week, index) => (
        <View key={index} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (!day) return <View key={dayIndex} style={styles.day} />;
            const key = dateKey(day);
            const count = workouts.get(key) ?? 0;
            const isToday = key === todayKey;
            const isSelected = key === selected;
            const future = key > todayKey;
            return (
              <Pressable
                key={key}
                role="button"
                aria-selected={isSelected}
                aria-label={t('history.day', {
                  date: formatDayTitle(day, language),
                  count,
                })}
                onPress={() => onSelect(key)}
                disabled={future}
                style={({ pressed }) => [styles.day, pressed && styles.pressed]}>
                <View
                  style={[
                    styles.date,
                    isToday && { backgroundColor: colors.accent },
                    isSelected && { borderColor: isToday ? colors.text : colors.accent },
                  ]}>
                  <Text
                    variant="bodyStrong"
                    color={isToday ? 'onAccent' : future ? 'textMuted' : 'text'}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={[styles.dot, count > 0 && { backgroundColor: colors.accent }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MonthButton({
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
      style={({ pressed }) => [styles.monthButton, (pressed || disabled) && styles.pressed]}>
      <Text variant="title" color={disabled ? 'textMuted' : 'accent'}>
        {symbol}
      </Text>
    </Pressable>
  );
}

const DATE_SIZE = 36;

const styles = StyleSheet.create({
  calendar: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  month: {
    flex: 1,
    textAlign: 'center',
  },
  monthButton: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
  },
  day: {
    flex: 1,
    minHeight: touch.min,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
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
    opacity: 0.5,
  },
});
