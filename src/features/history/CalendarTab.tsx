import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useRoutines } from '@/features/routines/useRoutines';
import {
  addDays,
  dateKey,
  formatDayTitle,
  fromDateKey,
  startOfWeek,
} from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { useWeekMoves } from '@/features/schedule/useWeekMoves';
import { useWeeklySports } from '@/features/schedule/useWeeklySports';
import { activitiesOnDate } from '@/features/schedule/week';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { addMonths, dayToShow, startOfMonth } from './calendar';
import { MonthCalendar } from './MonthCalendar';
import { useHistoryEntries } from './useHistory';
import { WorkoutRow } from './WorkoutRow';

// Profile → Calendar (US-23, US-24): the month with a ✓ on each day you
// trained, and under it the picked day's activities, today to begin with.
// A day without any says so (or that it was a rest day), and every past
// day can have one logged afterwards.
export function CalendarTab() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const today = useToday();
  const todayKey = dateKey(today);
  const [month, setMonth] = useState(() => startOfMonth(today));
  // Null: today, so it moves on with the date.
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? todayKey;
  const history = useHistoryEntries();
  const { data: routines = [] } = useRoutines();
  const { data: sports = [] } = useWeeklySports();
  // The picked day's week changes (the same days Avui asks for).
  const weekStart = startOfWeek(fromDateKey(selected));
  const { data: moves = [] } = useWeekMoves(
    dateKey(addDays(weekStart, -1)),
    dateKey(addDays(weekStart, 6)),
  );

  const workouts = new Map<string, number>();
  for (const entry of history.entries) {
    workouts.set(entry.date, (workouts.get(entry.date) ?? 0) + 1);
  }
  const dayEntries = history.entries.filter((entry) => entry.date === selected);
  const isToday = selected === todayKey;
  // A rest day: nothing planned that day (that week's moves counted), when
  // there is a plan.
  const restDay =
    (routines.some((routine) => routine.weekdays.length > 0) || sports.length > 0) &&
    activitiesOnDate(routines, sports, moves, fromDateKey(selected)).length === 0;

  // Logging an activity done that day (US-24): which routine, then the
  // editor.
  function logActivity() {
    const date = selected;
    const open = (routineId: string | null) =>
      router.push({
        pathname: '/profile/history/new',
        params: routineId ? { date, routineId } : { date },
      });
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('history.logOn', { date: formatDayTitle(fromDateKey(date), language) }),
        message: t('history.whichRoutine'),
        options: [...routines.map((routine) => routine.name), t('history.noRoutine'), t('common.cancel')],
        cancelButtonIndex: routines.length + 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index < routines.length) open(routines[index].id);
        else if (index === routines.length) open(null);
      },
    );
  }

  function changeMonth(months: -1 | 1) {
    const next = addMonths(month, months);
    setMonth(next);
    const day = dayToShow(next, today, new Set(workouts.keys()));
    setPicked(day === todayKey ? null : day);
  }

  function renderDay() {
    if (history.isPending) return <ActivityIndicator color={colors.accent} />;
    if (history.isError) {
      return (
        <View style={styles.gap}>
          <Text color="danger">{t('history.loadError')}</Text>
          <Button
            label={t('history.retry')}
            variant="secondary"
            onPress={() => void history.refetch()}
          />
        </View>
      );
    }
    return (
      <>
        {dayEntries.length > 0 ? (
          dayEntries.map((entry) => <WorkoutRow key={entry.id} entry={entry} />)
        ) : (
          <Text color="textMuted">
            {restDay
              ? t(isToday ? 'history.restToday' : 'history.restDay')
              : t(isToday ? 'history.nothingToday' : 'history.nothingThatDay')}
          </Text>
        )}
        <Button
          label={dayEntries.length > 0 ? t('history.logAnother') : t('history.logActivity')}
          variant="secondary"
          onPress={logActivity}
        />
      </>
    );
  }

  return (
    <View style={styles.page}>
      <MonthCalendar
        month={month}
        today={today}
        selected={selected}
        workouts={workouts}
        onDayPress={(day) => setPicked(day === todayKey ? null : day)}
        onMonthChange={changeMonth}
      />
      <Card style={styles.day}>
        <Text variant="cardTitle" accessibilityRole="header">
          {isToday ? t('history.today') : formatDayTitle(fromDateKey(selected), language)}
        </Text>
        {renderDay()}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  day: {
    gap: spacing.sm,
  },
  gap: {
    gap: spacing.md,
  },
});
