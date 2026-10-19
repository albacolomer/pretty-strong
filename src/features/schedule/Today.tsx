import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Text, useToast } from '@/components/ui';
import { usesExercises, WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';
import { useRoutines } from '@/features/routines/useRoutines';
import { workoutFromRoutine } from '@/features/workout/activeWorkout';
import { QuickLogSheet, type QuickLog } from '@/features/workout/QuickLogSheet';
import { ResumeBanner } from '@/features/workout/ResumeBanner';
import {
  CHANGE_REASONS,
  liveDuration,
  type ChangeReason,
  type WorkoutSession,
} from '@/features/workout/session';
import { useDeleteSession, useLogSession, useWeekSessions } from '@/features/workout/useSessions';
import { useWorkoutStore } from '@/features/workout/workoutStore';
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
// to start, mark done, swap or skip; or rest.
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
  const { data: savedSessions = [] } = useWeekSessions(from, to);
  const active = useWorkoutStore((state) => state.active);
  const pending = useWorkoutStore((state) => state.pending);
  const startWorkout = useWorkoutStore((state) => state.start);
  // Finished workouts not in the database yet (no signal) count as done.
  const sessions: WorkoutSession[] = [
    ...savedSessions,
    ...pending
      .filter((workout) => !savedSessions.some((session) => session.id === workout.id))
      .map((workout) => ({
        id: workout.id,
        date: workout.date,
        plannedRoutineId: workout.plannedRoutineId,
        routineId: workout.routineId,
        status: 'completed' as const,
        logMode: 'live' as const,
        durationS: liveDuration(workout.startedAt, workout.endedAt),
        notes: null,
        changeReason: workout.changeReason,
      })),
  ];
  const logSession = useLogSession(from, to);
  const deleteSession = useDeleteSession(from, to);
  const { swaps, setSwap } = useSwaps(from);

  // Copies the routine into a new workout and opens it. Only one at a time:
  // with another one going, it offers to go back to that one instead.
  function start(routine: Routine, plannedRoutineId: string | null, date: string) {
    if (active) {
      showToast({
        message: t('workout.alreadyActive'),
        action: { label: t('workout.resume'), onPress: () => router.push('/workout') },
      });
      return;
    }
    startWorkout(
      workoutFromRoutine(routine, {
        date,
        plannedRoutineId,
        changeReason: plannedRoutineId ? (swaps[date]?.[plannedRoutineId]?.reason ?? null) : null,
        startedAt: new Date().toISOString(),
        newId: randomUUID,
      }),
    );
    router.push('/workout');
  }

  // A routine just created from "Fes una altra rutina" (routines/new sends
  // its id back): start it as soon as it's in the list.
  const { start: createdRoutineId } = useLocalSearchParams<{ start?: string }>();
  // Started once, even if the screen redraws before the link is cleared.
  const startedCreated = useRef<string | null>(null);
  useEffect(() => {
    const created = routines?.find((routine) => routine.id === createdRoutineId);
    if (!created || startedCreated.current === created.id) return;
    startedCreated.current = created.id;
    router.setParams({ start: undefined });
    start(created, null, dateKey(today));
  });
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

  // "Fes una altra rutina": any routine, unplanned, today; or a new one,
  // made in the routine editor and started once it's saved.
  function startAnother() {
    const startable = allRoutines.filter((routine) => usesExercises(routine.label));
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('workout.otherRoutineTitle'),
        options: [
          ...startable.map((routine) => routine.name),
          t('workout.newRoutine'),
          t('common.cancel'),
        ],
        cancelButtonIndex: startable.length + 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        const routine = startable[index];
        if (routine) start(routine, null, day);
        else if (index === startable.length) {
          router.push({ pathname: '/plan/routines/new', params: { start: '1' } });
        }
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

      {active ? <ResumeBanner workout={active} /> : null}

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
          // This card's own workout, if it's the one going.
          const isActive =
            active?.date === day &&
            active.plannedRoutineId === routine.id &&
            active.routineId === shown.id;
          return (
            <TodayRoutineCard
              key={routine.id}
              planned={routine}
              shown={shown}
              session={session}
              canLog={canLog}
              // Live workouts are for today; a class is only marked done.
              onStart={
                showingToday && usesExercises(shown.label)
                  ? () => (isActive ? router.push('/workout') : start(shown, routine.id, day))
                  : undefined
              }
              startLabel={isActive ? t('workout.resume') : t('workout.start')}
              onDone={() => setLogging({ planned: routine, shown })}
              onSwap={() => swap(routine, shown)}
              onSkip={() => skip(routine)}
              onMenu={session || swapped ? () => openMenu(routine, shown, session) : undefined}
            />
          );
        })
      )}

      {showingToday ? (
        <Button label={t('workout.otherRoutine')} variant="ghost" onPress={startAnother} />
      ) : null}

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
