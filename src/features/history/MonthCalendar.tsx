import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text, Icon } from '@/components/ui';
import { WEEKDAYS } from '@/features/routines/routine';
import { dateKey, formatDayTitle } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { formatMonth, monthWeeks } from './calendar';

type MonthCalendarProps = {
  // The 1st of the month shown.
  month: Date;
  today: Date;
  // The day whose activities show below ("2026-10-20").
  selected: string;
  // How many workouts each day has, by "2026-10-20".
  workouts: Map<string, number>;
  // How many competitions or special dates each day has (US-30).
  events: Map<string, number>;
  onDayPress: (day: string) => void;
  onMonthChange: (months: -1 | 1) => void;
};

// Profile → Calendar (US-23): the month, Monday to Sunday, with a filled ✓
// on each day you trained, a gold ★ on each day with an event (US-30) and a
// ring on today; the picked day is filled softly (a ✓ day gets a dark
// ring). ‹ › change month, into the future too, for the events ahead.
export function MonthCalendar({
  month,
  today,
  selected,
  workouts,
  events,
  onDayPress,
  onMonthChange,
}: MonthCalendarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const todayKey = dateKey(today);
  const monthPrefix = dateKey(month).slice(0, 7);
  const isLaterMonth = monthPrefix > todayKey;
  const countIn = (days: Map<string, number>) =>
    [...days]
      .filter(([day]) => day.startsWith(monthPrefix))
      .reduce((total, [, count]) => total + count, 0);

  return (
    <Card style={styles.calendar}>
      <View style={styles.header}>
        <View style={styles.title}>
          <Text variant="name" accessibilityRole="header">
            {formatMonth(month, language)}
          </Text>
          <Text variant="caption" color="textMuted">
            {/* A month still to come has no workouts yet, only events. */}
            {isLaterMonth
              ? t('events.monthCount', { count: countIn(events) })
              : t('history.monthCount', { count: countIn(workouts) })}
          </Text>
        </View>
        <MonthButton symbol="‹" label={t('history.previousMonth')} onPress={() => onMonthChange(-1)} />
        <MonthButton symbol="›" label={t('history.nextMonth')} onPress={() => onMonthChange(1)} />
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
            const eventCount = events.get(key) ?? 0;
            const isToday = key === todayKey;
            const future = key > todayKey;
            const label = t('history.day', {
              date: formatDayTitle(day, language),
              count: workouts.get(key) ?? 0,
            });
            return (
              <Pressable
                key={key}
                role="button"
                aria-selected={key === selected}
                aria-label={
                  eventCount > 0 ? `${label}, ${t('events.onDay', { count: eventCount })}` : label
                }
                onPress={() => onDayPress(key)}
                style={({ pressed }) => [styles.day, pressed && styles.pressed]}>
                <View
                  style={[
                    styles.date,
                    done && { backgroundColor: colors.accent, borderColor: colors.accent },
                    isToday && !done && { borderColor: colors.accent },
                    key === selected &&
                      (done
                        ? { borderColor: colors.text }
                        : { backgroundColor: colors.accentSoft, borderColor: colors.accent }),
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
                  {eventCount > 0 ? (
                    <View style={[styles.star, { backgroundColor: colors.surface }]}>
                      <Icon name="star.fill" size={11} tintColor={colors.gold} />
                    </View>
                  ) : null}
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
}: {
  symbol: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
      <Text variant="cardTitle">{symbol}</Text>
    </Pressable>
  );
}

const DATE_SIZE = 38;
const STAR_SIZE = 17;

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
  // On the bubble's top right corner, on a disc of the card's colour so it
  // reads on a filled ✓ day too.
  star: {
    position: 'absolute',
    top: -6,
    right: -7,
    width: STAR_SIZE,
    height: STAR_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
});
