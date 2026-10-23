import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useRoutines } from '@/features/routines/useRoutines';
import { dateKey, formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, touch, useTheme } from '@/theme';

import { addMonths, startOfMonth } from './calendar';
import { MonthCalendar } from './MonthCalendar';
import { useHistoryEntries } from './useHistory';
import { WorkoutRow } from './WorkoutRow';

// The month's latest workouts shown under the calendar; "Mostra-ho tot"
// has the rest.
const MONTH_ROWS = 5;

// Profile → Calendar (US-23, US-24): the month with a ✓ on each day you
// trained, and its latest workouts under it. Tap a day with a ✓ for just
// that day (again for the whole month); tap an empty past day, or +, to
// log a workout done then.
export function CalendarTab() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const today = useToday();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState<string | null>(null);
  const history = useHistoryEntries();
  const { data: routines = [] } = useRoutines();

  const workouts = new Map<string, number>();
  for (const entry of history.entries) {
    workouts.set(entry.date, (workouts.get(entry.date) ?? 0) + 1);
  }
  const monthPrefix = dateKey(month).slice(0, 7);
  const shown = selected
    ? history.entries.filter((entry) => entry.date === selected)
    : history.entries.filter((entry) => entry.date.startsWith(monthPrefix)).slice(0, MONTH_ROWS);

  // "+ Registra un entrenament" (US-24): which routine, then the editor.
  function logPastWorkout(date: string) {
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

  function pressDay(day: string) {
    if (!workouts.has(day)) {
      logPastWorkout(day);
      return;
    }
    setSelected((current) => (current === day ? null : day));
  }

  function changeMonth(months: -1 | 1) {
    setMonth((current) => addMonths(current, months));
    setSelected(null);
  }

  function renderRows() {
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
    if (shown.length === 0) return <Text color="textMuted">{t('history.monthEmpty')}</Text>;
    return shown.map((entry) => <WorkoutRow key={entry.id} entry={entry} />);
  }

  return (
    <View style={styles.page}>
      <MonthCalendar
        month={month}
        today={today}
        selected={selected}
        workouts={workouts}
        onDayPress={pressDay}
        onMonthChange={changeMonth}
      />
      <Card>
        <View style={styles.header}>
          <Text variant="cardTitle" accessibilityRole="header" style={styles.title}>
            {selected ? formatDayTitle(fromDateKey(selected), language) : t('history.pastWorkouts')}
          </Text>
          <Pressable
            role="button"
            aria-label={t('history.logPast')}
            onPress={() => logPastWorkout(selected ?? dateKey(today))}
            hitSlop={8}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
            <Text variant="cardTitle" color="accent">
              +
            </Text>
          </Pressable>
          <Pressable
            role="button"
            onPress={() => router.push('/profile/history/all')}
            hitSlop={8}
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
            <Text variant="bodyStrong" color="accent">
              {t('history.seeAll')}
            </Text>
          </Pressable>
        </View>
        {renderRows()}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  add: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAll: {
    minHeight: touch.min,
    justifyContent: 'center',
  },
  gap: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
