import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';
import { RoutineTypeTag } from '@/features/routines/RoutineTypeTag';
import { useRoutineSummary } from '@/features/routines/useRoutineSummary';
import { useRoutines } from '@/features/routines/useRoutines';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { addDays, formatDayTitle, startOfWeek, weekdayOf } from './dates';
import { useToday } from './useToday';
import { routinesOnDay } from './week';
import { WeekStrip } from './WeekStrip';

// The Today tab (US-11): the date, the week strip, and the plan for today,
// or for the day picked in the strip: one card per routine, or rest.
export function Today() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const today = useToday();
  const todayWeekday = weekdayOf(today);
  // A day picked in the strip; null shows today. A weekday rather than a
  // date, so it stays in the current week when the date changes.
  const [picked, setPicked] = useState<Weekday | null>(null);
  const selected = picked ?? todayWeekday;
  const weekStart = startOfWeek(today);
  const { data: routines, isPending, isError } = useRoutines();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;

  const planned = routinesOnDay(routines, selected);
  const weekIsEmpty = WEEKDAYS.every((day) => routinesOnDay(routines, day).length === 0);
  const showingToday = selected === todayWeekday;

  return (
    <View style={styles.today}>
      <Text variant="bodyStrong" color="textMuted">
        {formatDayTitle(today, language)}
      </Text>

      <WeekStrip
        weekStart={weekStart}
        today={todayWeekday}
        selected={selected}
        plannedCount={(day) => routinesOnDay(routines, day).length}
        onSelect={(day) => setPicked(day === todayWeekday ? null : day)}
      />

      {showingToday ? null : (
        <View style={styles.pickedHeader}>
          <Text variant="cardTitle" accessibilityRole="header" style={styles.pickedTitle}>
            {formatDayTitle(addDays(weekStart, selected - 1), language)}
          </Text>
          <Button label={t('today.backToToday')} variant="ghost" onPress={() => setPicked(null)} />
        </View>
      )}

      {routines.length === 0 ? (
        <Card>
          <Text color="textMuted">{t('schedule.noRoutines')}</Text>
        </Card>
      ) : weekIsEmpty ? (
        <Card>
          <Text color="textMuted">{t('today.noWeek')}</Text>
        </Card>
      ) : planned.length === 0 ? (
        <Card>
          <Text variant="cardTitle">{t('today.rest')}</Text>
          <Text color="textMuted">
            {showingToday ? t('today.restToday') : t('today.restOther')}
          </Text>
        </Card>
      ) : (
        planned.map((routine) => <PlannedRoutineCard key={routine.id} routine={routine} />)
      )}
    </View>
  );
}

// One routine planned on the day: its type, name and a short preview.
// Tapping it opens the routine.
function PlannedRoutineCard({ routine }: { routine: Routine }) {
  const summary = useRoutineSummary(routine, { withDays: false });

  return (
    <Pressable
      role="button"
      onPress={() => router.push({ pathname: '/plan/routines/[id]', params: { id: routine.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.cardTitle}>
          <Text variant="cardTitle" style={styles.name}>
            {routine.name}
          </Text>
          <RoutineTypeTag routine={routine} />
        </View>
        {summary !== '' ? <Text color="textMuted">{summary}</Text> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  today: {
    gap: spacing.lg,
  },
  pickedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickedTitle: {
    flex: 1,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
