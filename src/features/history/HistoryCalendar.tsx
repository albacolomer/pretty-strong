import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { formatDuration } from '@/features/routines/routine';
import { dateKey, formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { countSets } from '@/features/workout/activeWorkout';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { addMonths, startOfMonth } from './calendar';
import { MonthCalendar } from './MonthCalendar';
import type { HistoryEntry } from './pastWorkout';
import { useHistoryMonth } from './useHistory';

type Row = HistoryEntry & { pending: boolean };

// The History tab (US-23, spec: History) as a calendar: a month with a dot
// on each day you trained, and under it that month's workouts, newest
// first. Tap a day for just that day; tap it again for the whole month. A
// workout finished with no signal shows too, until it's saved.
export function HistoryCalendar() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const today = useToday();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState<string | null>(null);
  const history = useHistoryMonth(month);
  const waiting = useWorkoutStore((state) => state.pending);

  // "2026-10": a workout's date starts with it when it's this month's.
  const monthPrefix = dateKey(month).slice(0, 7);
  const pending: Row[] = waiting
    .filter((workout) => workout.date.startsWith(monthPrefix))
    .map((workout) => ({
      id: workout.id,
      date: workout.date,
      routineName: workout.routineName,
      logMode: 'live',
      durationS: Math.round(
        (new Date(workout.endedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000,
      ),
      exercises: workout.exercises.filter((exercise) =>
        exercise.sets.some((set) => set.completedAt !== null),
      ).length,
      sets: countSets(workout).done,
      pending: true,
    }));
  const saved: Row[] = (history.data ?? [])
    .filter((entry) => !waiting.some((workout) => workout.id === entry.id))
    .map((entry) => ({ ...entry, pending: false }));
  const rows = [...pending, ...saved].sort((a, b) => b.date.localeCompare(a.date));

  const workouts = new Map<string, number>();
  for (const row of rows) workouts.set(row.date, (workouts.get(row.date) ?? 0) + 1);
  const shown = selected ? rows.filter((row) => row.date === selected) : rows;

  function changeMonth(months: -1 | 1) {
    setMonth((current) => addMonths(current, months));
    setSelected(null);
  }

  function renderList() {
    if (history.isPending) return <ActivityIndicator color={colors.accent} />;
    if (history.isError) {
      return (
        <View style={styles.list}>
          <Text color="danger">{t('history.loadError')}</Text>
          <Button
            label={t('history.retry')}
            variant="secondary"
            onPress={() => void history.refetch()}
          />
        </View>
      );
    }
    if (shown.length === 0) {
      return (
        <Card>
          <Text color="textMuted">
            {selected ? t('history.dayEmpty') : t('history.monthEmpty')}
          </Text>
        </Card>
      );
    }
    return (
      <View style={styles.list}>
        {shown.map((row) => (
          <HistoryRow key={row.id} row={row} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <MonthCalendar
        month={month}
        today={today}
        selected={selected}
        workouts={workouts}
        onSelect={(day) => setSelected((current) => (current === day ? null : day))}
        onMonthChange={changeMonth}
      />
      <Text variant="bodyStrong" color="textMuted" accessibilityRole="header">
        {selected
          ? formatDayTitle(fromDateKey(selected), language)
          : t('history.monthCount', { count: rows.length })}
      </Text>
      {renderList()}
    </View>
  );
}

function HistoryRow({ row }: { row: Row }) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const name = row.routineName ?? t('history.noRoutine');
  const date = formatDayTitle(fromDateKey(row.date), language);
  const details = [
    row.durationS === null ? null : formatDuration(row.durationS),
    row.exercises > 0 ? t('history.exercises', { count: row.exercises }) : null,
    row.sets > 0 ? t('history.sets', { count: row.sets }) : null,
    row.logMode === 'quick' && row.sets === 0 ? t('history.quick') : null,
    row.pending ? t('history.pending') : null,
  ].filter((part) => part !== null);

  const content = (
    <Card>
      <Text variant="caption" color="textMuted">
        {date}
      </Text>
      <Text variant="bodyStrong">{name}</Text>
      {details.length > 0 ? (
        <Text variant="caption" color={row.pending ? 'accent' : 'textMuted'}>
          {details.join(' · ')}
        </Text>
      ) : null}
    </Card>
  );

  // Not in the database yet, so there's nothing to open.
  if (row.pending) return content;
  return (
    <Pressable
      role="button"
      aria-label={t('history.open', { name, date })}
      onPress={() => router.push({ pathname: '/history/[sessionId]', params: { sessionId: row.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  list: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
});
