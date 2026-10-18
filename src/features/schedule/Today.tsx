import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Text, useToast } from '@/components/ui';
import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';
import { useRoutines } from '@/features/routines/useRoutines';
import { QuickLogSheet, type QuickLog } from '@/features/workout/QuickLogSheet';
import {
  CHANGE_REASONS,
  type ChangeReason,
  type WorkoutSession,
} from '@/features/workout/session';
import { useDeleteSession, useLogSession, useWeekSessions } from '@/features/workout/useSessions';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { addDays, dateKey, formatDayTitle, startOfWeek, weekdayOf } from './dates';
import { TodayRoutineCard } from './TodayRoutineCard';
import { useSwaps } from './useSwaps';
import { useToday } from './useToday';
import { routinesOnDay } from './week';
import { WeekStrip, type DayState } from './WeekStrip';

// The Today tab (US-11, US-12, US-20): the date, the week strip, and the
// plan for today, or for the day picked in the strip: one card per routine,
// to mark done, swap or skip; or rest.
export function Today() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const showToast = useToast();
  const today = useToday();
  const todayWeekday = weekdayOf(today);
  // A day picked in the strip; null shows today. A weekday rather than a
  // date, so it stays in the current week when the date changes.
  const [picked, setPicked] = useState<Weekday | null>(null);
  const selected = picked ?? todayWeekday;
  const weekStart = startOfWeek(today);
  const from = dateKey(weekStart);
  const to = dateKey(addDays(weekStart, 6));
  const { data: routines, isPending, isError } = useRoutines();
  const { data: sessions = [] } = useWeekSessions(from, to);
  const logSession = useLogSession(from, to);
  const deleteSession = useDeleteSession(from, to);
  const { swaps, setSwap } = useSwaps(from);
  // The routine whose "Fet" sheet is open.
  const [logging, setLogging] = useState<{ planned: Routine; shown: Routine } | null>(null);

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;

  // Loaded by now; named again because TypeScript forgets that inside the
  // functions below.
  const allRoutines = routines;
  const day = dateKey(addDays(weekStart, selected - 1));
  const planned = routinesOnDay(routines, selected);
  const weekIsEmpty = WEEKDAYS.every((weekday) => routinesOnDay(routines, weekday).length === 0);
  const showingToday = selected === todayWeekday;
  // Today and earlier days of the week can be logged; days ahead can't yet.
  const canLog = selected <= todayWeekday;

  // A planned routine's session that day, the latest if there are several.
  function sessionFor(routine: Routine): WorkoutSession | undefined {
    return sessions
      .filter((session) => session.date === day && session.plannedRoutineId === routine.id)
      .at(-1);
  }

  // What the card shows: what was done, else the swap, else the plan.
  function shownFor(routine: Routine, session: WorkoutSession | undefined): Routine {
    const id = session?.routineId ?? swaps[day]?.[routine.id]?.routineId;
    return allRoutines.find((other) => other.id === id) ?? routine;
  }

  function dayInfo(weekday: Weekday): { state: DayState; planned: number } {
    const key = dateKey(addDays(weekStart, weekday - 1));
    const daySessions = sessions.filter((session) => session.date === key);
    const count = routinesOnDay(allRoutines, weekday).length;
    if (daySessions.some((session) => session.status === 'completed')) {
      return { state: 'done', planned: count };
    }
    if (daySessions.some((session) => session.status === 'skipped')) {
      return { state: 'skipped', planned: count };
    }
    return { state: count > 0 ? 'planned' : 'rest', planned: count };
  }

  // The native list of reasons, optional: "Sense motiu" logs without one.
  function askReason(title: string, onPick: (reason: ChangeReason | null) => void) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [
          ...CHANGE_REASONS.map((reason) => t(`workout.reasons.${reason}`)),
          t('workout.noReason'),
          t('common.cancel'),
        ],
        cancelButtonIndex: CHANGE_REASONS.length + 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index < CHANGE_REASONS.length) onPick(CHANGE_REASONS[index]);
        else if (index === CHANGE_REASONS.length) onPick(null);
      },
    );
  }

  function log(session: WorkoutSession, message: string) {
    logSession.mutate(session);
    showToast({
      message,
      action: { label: t('common.undo'), onPress: () => deleteSession.mutate(session) },
    });
  }

  function skip(routine: Routine) {
    askReason(t('today.skipReasonTitle'), (reason) =>
      log(
        {
          id: randomUUID(),
          date: day,
          plannedRoutineId: routine.id,
          routineId: null,
          status: 'skipped',
          logMode: 'quick',
          durationS: null,
          notes: null,
          changeReason: reason,
        },
        t('today.skipped', { name: routine.name }),
      ),
    );
  }

  function saveDone({ durationS, notes }: QuickLog) {
    if (!logging) return;
    const { planned: routine, shown } = logging;
    setLogging(null);
    log(
      {
        id: randomUUID(),
        date: day,
        plannedRoutineId: routine.id,
        routineId: shown.id,
        status: 'completed',
        logMode: 'quick',
        durationS,
        notes,
        changeReason: swaps[day]?.[routine.id]?.reason ?? null,
      },
      t('today.logged', { name: shown.name }),
    );
  }

  // Another routine instead of the planned one, for this day only.
  function swap(routine: Routine, shown: Routine) {
    const others = allRoutines.filter((other) => other.id !== shown.id);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('today.swapTitle', { name: routine.name }),
        options: [...others.map((other) => other.name), t('common.cancel')],
        cancelButtonIndex: others.length,
        userInterfaceStyle: scheme,
      },
      (index) => {
        const chosen = others[index];
        if (!chosen) return;
        // Back to the plan: nothing to explain.
        if (chosen.id === routine.id) {
          setSwap(day, routine.id, null);
          return;
        }
        askReason(t('today.swapReasonTitle'), (reason) =>
          setSwap(day, routine.id, { routineId: chosen.id, reason }),
        );
      },
    );
  }

  // ⋯: "Desfés" once logged; "Torna a «…»" while swapped.
  function openMenu(routine: Routine, shown: Routine, session: WorkoutSession | undefined) {
    const actions = session
      ? [{ label: t('common.undo'), run: () => deleteSession.mutate(session) }]
      : [
          {
            label: t('today.backToPlanned', { name: routine.name }),
            run: () => setSwap(day, routine.id, null),
          },
        ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: shown.name,
        options: [...actions.map((action) => action.label), t('common.cancel')],
        cancelButtonIndex: actions.length,
        userInterfaceStyle: scheme,
      },
      (index) => actions[index]?.run(),
    );
  }

  return (
    <View style={styles.today}>
      <Text variant="bodyStrong" color="textMuted">
        {formatDayTitle(today, language)}
      </Text>

      <WeekStrip
        weekStart={weekStart}
        today={todayWeekday}
        selected={selected}
        dayInfo={dayInfo}
        onSelect={(weekday) => setPicked(weekday === todayWeekday ? null : weekday)}
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
        planned.map((routine) => {
          const session = sessionFor(routine);
          const shown = shownFor(routine, session);
          const swapped = !session && shown.id !== routine.id;
          return (
            <TodayRoutineCard
              key={routine.id}
              planned={routine}
              shown={shown}
              session={session}
              canLog={canLog}
              onDone={() => setLogging({ planned: routine, shown })}
              onSwap={() => swap(routine, shown)}
              onSkip={() => skip(routine)}
              onMenu={session || swapped ? () => openMenu(routine, shown, session) : undefined}
            />
          );
        })
      )}

      <QuickLogSheet
        visible={logging !== null}
        routineName={logging?.shown.name ?? ''}
        plannedDurationS={logging?.shown.plannedDurationS ?? null}
        onCancel={() => setLogging(null)}
        onSave={saveDone}
      />
    </View>
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
});
