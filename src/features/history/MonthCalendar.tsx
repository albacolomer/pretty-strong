import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { WEEKDAYS } from '@/features/routines/routine';
import { dateKey, formatDayTitle } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { formatMonth, monthWeeks } from './calendar';

type MonthCalendarProps = {
  // The 1st of the month shown.
  month: Date;
  today: Date;
  // A day picked to see just its workouts ("2026-10-20"), or null.
  selected: string | null;
  // How many workouts each day has, by "2026-10-20".
  workouts: Map<string, number>;
  onDayPress: (day: string) => void;
  onMonthChange: (months: -1 | 1) => void;
};

// Profile → Calendar (US-23): the month, Monday to Sunday, with a pink ✓
// on each day you trained and a ring on today. ‹ › change month; there's
// nothing to see after this one.
export function MonthCalendar({
  month,
  today,
  selected,
  workouts,
  onDayPress,
  onMonthChange,
}: MonthCalendarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const todayKey = dateKey(today);
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const monthPrefix = dateKey(month).slice(0, 7);
  const count = [...workouts]
    .filter(([day]) => day.startsWith(monthPrefix))
    .reduce((total, [, workoutsThatDay]) => total + workoutsThatDay, 0);

  return (
    <Card style={styles.calendar}>
      <View style={styles.header}>
        <View style={styles.title}>
          <Text variant="cardTitle" accessibilityRole="header">
            {formatMonth(month, language)}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('history.monthCount', { count })}
          </Text>
        </View>
        <MonthButton symbol="‹" label={t('history.previousMonth')} onPress={() => onMonthChange(-1)} />
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
            const done = (workouts.get(key) ?? 0) > 0;
            const isToday = key === todayKey;
            const future = key > todayKey;
            return (
              <Pressable
                key={key}
                role="button"
                aria-selected={key === selected}
                aria-label={t('history.day', {
                  date: formatDayTitle(day, language),
                  count: workouts.get(key) ?? 0,
                })}
                onPress={() => onDayPress(key)}
                disabled={future}
                style={({ pressed }) => [styles.day, pressed && styles.pressed]}>
                <View
                  style={[
                    styles.date,
                    done && { backgroundColor: colors.accent, borderColor: colors.accent },
                    isToday && !done && { borderColor: colors.accent },
                    key === selected && { borderColor: colors.text },
                  ]}>
                  {done ? (
                    <Text variant="bodyStrong" color="onAccent">
                      ✓
                    </Text>
                  ) : (
                    <Text
                      variant={isToday ? 'bodyStrong' : 'body'}
                      color={future ? 'textMuted' : 'text'}>
                      {day.getDate()}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
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
      <Text variant="cardTitle" color={disabled ? 'textMuted' : 'text'}>
        {symbol}
      </Text>
    </Pressable>
  );
}

const DATE_SIZE = 38;

const styles = StyleSheet.create({
  calendar: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
  },
  monthButton: {
    width: 40,
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
    justifyContent: 'center',
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
  pressed: {
    opacity: 0.5,
  },
});
