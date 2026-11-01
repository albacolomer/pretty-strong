import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, ScreenTitle, Text, useToast } from '@/components/ui';
import { APP_DEFAULT_REST_S } from '@/features/exercises/rest';
import { useExerciseSettings } from '@/features/exercises/useExerciseSettings';
import { useBeats, useHistoryEntries } from '@/features/history/useHistory';
import { useProfile } from '@/features/profile/useProfile';
import { useWeeklyGoal } from '@/features/profile/useWeeklyGoal';
import { StepsCard } from '@/features/steps/StepsCard';
import {
  formatDuration,
  routineDuration,
  usesExercises,
  WEEKDAYS,
  type Routine,
} from '@/features/routines/routine';
import { ROUTINE_ICONS } from '@/features/routines/routineIcons';
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
import { ensureNotificationPermission } from '@/lib/notifications';
import { spacing, useTheme } from '@/theme';

import { AlsoToday, type AlsoTodayItem } from './AlsoToday';
import { addDays, dateKey, formatDayTitle, formatWeekday, startOfWeek, weekdayOf } from './dates';
import { DayDone } from './DayDone';
import { LogSportSheet, type LoggedSport } from './LogSportSheet';
import { MissedDay } from './MissedDay';
import {
  nextRestDate,
  plannedRoutineOf,
  rearranged,
  shiftWeek,
  withMove,
  type Move,
  type PlannedRoutine,
  type RoutineActivity,
} from './moves';
import { ReprogramSheet, type ReprogramDay, type ReprogramRoutine } from './ReprogramSheet';
import { RestDay } from './RestDay';
import { RoutinePreviewSheet } from './RoutinePreviewSheet';
import { countsAsWorkout, SPORT_ICONS, type Sport, type WeeklySport } from './sports';
import { TodayHero, type HeroAction } from './TodayHero';
import { useActivityName } from './useActivityName';
import { useSwaps } from './useSwaps';
import { useToday } from './useToday';
import { useSetWeekMoves, useWeekMoves } from './useWeekMoves';
import { useWeeklySports } from './useWeeklySports';
import {
  activitiesOnDate,
  activitiesOnDay,
  nextDayPosition,
  nextPlannedDay,
  type DayActivity,
} from './week';

type Action = { label: string; run: () => void };

// The Avui tab (US-11, US-12, US-20): the date and "AVUI", today's steps,
// then the day's main activity in a big metal button inside the week's
// ring (GO, or ✓ for a class or a sport), with Previsualitza / Canvia / Salta (which
// can move a routine to a free day or shift the week, US-29); on a
// rest day, a word on recovery, what's next and Caminar / Estiraments; once
// it's all done, "Tot fet" with the day in numbers. Above it, yesterday's
// routine if it wasn't logged at all (US-29). Under it, "També avui" with
// the day's other activities, what was logged without being planned, and
// a + to log more.
export function Today() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const language = useAppLanguage();
  const showToast = useToast();
  const nameOf = useActivityName();
  const today = useToday();
  const day = dateKey(today);
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);
  const from = dateKey(weekStart);
  const to = dateKey(weekEnd);
  const { data: routines, isPending, isError } = useRoutines();
  const { data: sports = [] } = useWeeklySports();
  // This week's changes and sessions, from last Sunday on: on a Monday,
  // yesterday's routine can still be missed, and come into this week.
  const movesFrom = dateKey(addDays(weekStart, -1));
  const { data: moves = [], isSuccess: movesLoaded } = useWeekMoves(movesFrom, to);
  const setMoves = useSetWeekMoves(movesFrom, to);
  const goal = useWeeklyGoal();
  const { data: profile } = useProfile();
  const { data: savedSessions = [], isSuccess: sessionsLoaded } = useWeekSessions(movesFrom, to);
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
        plannedSportId: null,
        sport: null,
        sportName: null,
      })),
  ];
  // Today's finished workouts with their totals, for "Tot fet".
  const { entries: history } = useHistoryEntries();
  const doneToday = history.filter((entry) => entry.date === day);
  const beats = useBeats(doneToday);
  const logSession = useLogSession(movesFrom, to);
  const deleteSession = useDeleteSession(movesFrom, to);
  const { swaps, setSwap } = useSwaps(from);
  // Your own default rest per exercise, fixed into the workout when it starts.
  const { data: settings } = useExerciseSettings();
  // What the "Fet" sheet is open for: a routine (as shown), a sport, or a
  // rest day's walk or stretching.
  const [logging, setLogging] = useState<
    | { kind: 'routine'; planned: Routine; shown: Routine }
    | { kind: 'sport'; sport: WeeklySport }
    | { kind: 'recovery'; sport: Sport }
    | null
  >(null);
  const [previewing, setPreviewing] = useState<{ routine: Routine; planned: Routine } | null>(
    null,
  );
  // The "Registra un esport" sheet, and a count that gives each opening a
  // fresh start.
  const [loggingSport, setLoggingSport] = useState({ visible: false, opened: 0 });
  // "Reprograma la setmana…", open with yesterday's missed routine too (put
  // under today) when it comes from the nudge.
  const [reprogramming, setReprogramming] = useState<{ missed: RoutineActivity | null } | null>(
    null,
  );

  // Copies the routine into a new workout and opens it. Only one at a time:
  // with another one going, it offers to go back to that one instead.
  function start(routine: Routine, plannedRoutineId: string | null) {
    if (active) {
      showToast({
        message: t('workout.alreadyActive'),
        action: { label: t('workout.resume'), onPress: () => router.push('/workout') },
      });
      return;
    }
    // Asked once, before the first rest: "rest is over" needs it.
    void ensureNotificationPermission();
    startWorkout(
      workoutFromRoutine(routine, {
        date: day,
        plannedRoutineId,
        changeReason: plannedRoutineId ? (swaps[day]?.[plannedRoutineId]?.reason ?? null) : null,
        startedAt: new Date().toISOString(),
        newId: randomUUID,
        defaultRestS: (exerciseId) => settings?.[exerciseId]?.defaultRestS ?? APP_DEFAULT_REST_S,
      }),
    );
    router.push('/workout');
  }

  // A routine just created from "+" → "Crea una rutina nova" (routines/new
  // sends its id back): start it as soon as it's in the list.
  const { start: createdRoutineId } = useLocalSearchParams<{ start?: string }>();
  // Started once, even if the screen redraws before the link is cleared.
  const startedCreated = useRef<string | null>(null);
  useEffect(() => {
    const created = routines?.find((routine) => routine.id === createdRoutineId);
    if (!created || startedCreated.current === created.id) return;
    startedCreated.current = created.id;
    router.setParams({ start: undefined });
    start(created, null);
  });

  const header = <ScreenTitle eyebrow={formatDayTitle(today, language)} title={t('tabs.today')} />;

  if (isPending) {
    return (
      <View style={styles.today}>
        {header}
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;

  // Loaded by now; named again because TypeScript forgets that inside the
  // functions below.
  const allRoutines = routines;
  const planned = activitiesOnDate(routines, sports, moves, today);
  const weekIsEmpty = WEEKDAYS.every(
    (other) => activitiesOnDay(routines, sports, other).length === 0,
  );
  // This week's (not last Sunday's); walks and stretching don't count
  // toward the goal.
  const doneThisWeek = sessions.filter(
    (session) =>
      session.date >= from && session.status === 'completed' && countsAsWorkout(session),
  ).length;
  // The week ring around the main button (or "Tot fet").
  const segments = Math.max(goal ?? 0, doneThisWeek, 1);
  const progress =
    goal === null
      ? t('today.weekDone', { count: doneThisWeek })
      : t('today.weekProgress', { done: doneThisWeek, count: goal });

  // A planned activity's session today, the latest if there are several.
  function sessionOf(activity: DayActivity): WorkoutSession | undefined {
    return sessions
      .filter(
        (session) =>
          session.date === day &&
          (activity.kind === 'routine'
            ? session.plannedRoutineId === activity.routine.id
            : session.plannedSportId === activity.sport.id),
      )
      .at(-1);
  }

  // What a routine shows: what was done, else the swap, else the plan.
  function shownFor(routine: Routine, session: WorkoutSession | undefined): Routine {
    const id = session?.routineId ?? swaps[day]?.[routine.id]?.routineId;
    return allRoutines.find((other) => other.id === id) ?? routine;
  }

  // The main one: the first routine to start still to do, else any routine
  // or sport still to do, else (all logged) the first of the day.
  const open = planned.filter((activity) => !sessionOf(activity));
  const main =
    open.find(
      (activity) => activity.kind === 'routine' && usesExercises(activity.routine.label),
    ) ??
    open.find((activity) => activity.kind === 'routine') ??
    open[0] ??
    planned.find((activity) => activity.kind === 'routine') ??
    planned[0] ??
    null;
  // Everything planned is logged, and not all skipped: "Tot fet", with all
  // of the day's activities under "També avui".
  const allDone =
    planned.length > 0 &&
    open.length === 0 &&
    planned.some((activity) => sessionOf(activity)?.status === 'completed');
  const others = allDone ? planned : planned.filter((activity) => activity !== main);

  // "Esquena i bíceps · 7 exercicis · ~1 h 30 min", or "19:00 · 1 h".
  function detailsOf(activity: DayActivity, shown?: Routine): string {
    if (activity.kind === 'sport') {
      return [
        activity.sport.startTime,
        activity.sport.durationS ? formatDuration(activity.sport.durationS) : null,
      ]
        .filter(Boolean)
        .join(' · ');
    }
    const routine = shown ?? activity.routine;
    const duration = routineDuration(routine, APP_DEFAULT_REST_S);
    const count = routine.exercises.length;
    return [
      routine.description,
      usesExercises(routine.label) && count > 0
        ? routine.label === 'run'
          ? t('routines.blockCount', { count })
          : t('routines.exerciseCount', { count })
        : null,
      duration ? `${duration.estimated ? '~' : ''}${formatDuration(duration.seconds)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
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

  function sheet(title: string, actions: Action[]) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), t('common.cancel')],
        cancelButtonIndex: actions.length,
        userInterfaceStyle: scheme,
      },
      (index) => actions[index]?.run(),
    );
  }

  function log(session: WorkoutSession, message: string) {
    logSession.mutate(session);
    showToast({
      message,
      action: { label: t('common.undo'), onPress: () => deleteSession.mutate(session) },
    });
  }

  const noSport = { plannedSportId: null, sport: null, sportName: null };

  function skip(activity: DayActivity) {
    askReason(t('today.skipReasonTitle'), (reason) =>
      log(
        {
          id: randomUUID(),
          date: day,
          plannedRoutineId: activity.kind === 'routine' ? activity.routine.id : null,
          routineId: null,
          status: 'skipped',
          logMode: 'quick',
          durationS: null,
          notes: null,
          changeReason: reason,
          ...(activity.kind === 'sport'
            ? {
                plannedSportId: activity.sport.id,
                sport: activity.sport.sport,
                sportName: activity.sport.customName,
              }
            : noSport),
        },
        t('today.skipped', { name: nameOf(activity) }),
      ),
    );
  }

  // A change to this week, with "Desfés" to put it back as it was.
  function changeWeek(next: Move[], message: string) {
    const previous = moves;
    setMoves.mutate(next);
    showToast({
      message,
      action: { label: t('common.undo'), onPress: () => setMoves.mutate(previous) },
    });
  }

  // Already logged today, or going now: it stays where it is.
  function isLogged(activity: RoutineActivity, date: string): boolean {
    return (
      date === day &&
      (sessionOf(activity) !== undefined ||
        (active?.date === day && active.plannedRoutineId === activity.routine.id))
    );
  }

  // Where a routine on `date` (today, or yesterday's missed one) can go this
  // week (US-29): the next free day, the week a day on from it (Sunday's
  // drops off; what's logged stays), or the week rearranged by hand. None on
  // the week's last day.
  function moveOptions(activity: RoutineActivity, date: Date): Action[] {
    const key = dateKey(date);
    const planned = plannedRoutineOf(activity, key);
    const { name } = activity.routine;
    const free = nextRestDate(allRoutines, sports, moves, today, weekEnd);
    return [
      ...(free
        ? [
            {
              label: t('today.moveTo', { day: formatWeekday(free, language) }),
              run: () =>
                changeWeek(
                  withMove(moves, planned, dateKey(free)),
                  t('today.moved', { name, day: formatWeekday(free, language) }),
                ),
            },
          ]
        : []),
      ...(day < to
        ? [
            {
              label: t('today.shiftWeek'),
              run: () => {
                const shifted = shiftWeek(
                  allRoutines,
                  sports,
                  moves,
                  planned,
                  date,
                  weekEnd,
                  isLogged,
                );
                changeWeek(
                  shifted.moves,
                  shifted.dropped.length > 0
                    ? t('today.shiftedDropped', {
                        count: shifted.dropped.length,
                        name: shifted.dropped[0].name,
                      })
                    : t('today.shifted'),
                );
              },
            },
            {
              label: t('today.reprogram'),
              run: () => setReprogramming({ missed: key < day ? activity : null }),
            },
          ]
        : []),
    ];
  }

  // Salta on a routine: one of those, or just skipped with a reason. On the
  // week's last day there's nowhere to go, so it's just skipped.
  function skipRoutine(activity: RoutineActivity) {
    const options = moveOptions(activity, today);
    if (options.length === 0) {
      skip(activity);
      return;
    }
    sheet(t('today.skipWhat', { name: activity.routine.name }), [
      ...options,
      { label: t('today.justSkip'), run: () => skip(activity) },
    ]);
  }

  // The missed-day nudge: yesterday's routine, if it wasn't logged at all
  // ("Només salta-la" is an answer already) and you had the app by then.
  // Any answer moves it or logs it, so it shows once per missed day.
  const yesterday = addDays(today, -1);
  const yesterdayKey = dateKey(yesterday);
  const since = profile ? dateKey(new Date(profile.created_at)) : null;
  const missed =
    sessionsLoaded && movesLoaded && since !== null && since <= yesterdayKey
      ? activitiesOnDate(allRoutines, sports, moves, yesterday).find(
          (activity): activity is RoutineActivity =>
            activity.kind === 'routine' &&
            !sessions.some(
              (session) =>
                session.date === yesterdayKey && session.plannedRoutineId === activity.routine.id,
            ) &&
            !(active?.date === yesterdayKey && active.plannedRoutineId === activity.routine.id),
        )
      : undefined;

  // "Fes-la avui": after today's own.
  function doMissedToday(activity: RoutineActivity) {
    changeWeek(
      withMove(
        moves,
        plannedRoutineOf(activity, yesterdayKey),
        day,
        nextDayPosition(allRoutines, sports, weekdayOf(today)),
      ),
      t('today.movedToday', { name: activity.routine.name }),
    );
  }

  // "Altres opcions": move it, shift the week, rearrange it, or "Deixa-ho"
  // (logged as skipped yesterday).
  function missedOptions(activity: RoutineActivity) {
    sheet(t('today.skipWhat', { name: activity.routine.name }), [
      ...moveOptions(activity, yesterday),
      {
        label: t('today.leaveIt'),
        run: () =>
          log(
            {
              id: randomUUID(),
              date: yesterdayKey,
              plannedRoutineId: activity.routine.id,
              routineId: null,
              status: 'skipped',
              logMode: 'quick',
              durationS: null,
              notes: null,
              changeReason: null,
              ...noSport,
            },
            t('today.skipped', { name: activity.routine.name }),
          ),
      },
    ]);
  }

  function markDone(activity: DayActivity) {
    if (activity.kind === 'sport') {
      setLogging({ kind: 'sport', sport: activity.sport });
      return;
    }
    const shown = shownFor(activity.routine, undefined);
    setLogging({ kind: 'routine', planned: activity.routine, shown });
  }

  function saveDone({ durationS, notes }: QuickLog) {
    if (!logging) return;
    setLogging(null);
    if (logging.kind === 'recovery') {
      const { sport } = logging;
      log(
        {
          id: randomUUID(),
          date: day,
          plannedRoutineId: null,
          routineId: null,
          status: 'completed',
          logMode: 'quick',
          durationS,
          notes,
          changeReason: null,
          plannedSportId: null,
          sport,
          sportName: null,
        },
        t('today.logged', { name: t(`sports.${sport}`) }),
      );
      return;
    }
    if (logging.kind === 'sport') {
      const { sport } = logging;
      log(
        {
          id: randomUUID(),
          date: day,
          plannedRoutineId: null,
          routineId: null,
          status: 'completed',
          logMode: 'quick',
          durationS,
          notes,
          changeReason: null,
          plannedSportId: sport.id,
          sport: sport.sport,
          sportName: sport.customName,
        },
        t('today.logged', { name: nameOf({ kind: 'sport', sport }) }),
      );
      return;
    }
    const { planned: routine, shown } = logging;
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
        ...noSport,
      },
      t('today.logged', { name: shown.name }),
    );
  }

  // A sport done today that wasn't planned (from +).
  function saveSport({ sport, customName, durationS }: LoggedSport) {
    log(
      {
        id: randomUUID(),
        date: day,
        plannedRoutineId: null,
        routineId: null,
        status: 'completed',
        logMode: 'quick',
        durationS,
        notes: null,
        changeReason: null,
        plannedSportId: null,
        sport,
        sportName: customName,
      },
      t('today.logged', { name: nameOf({ kind: 'sport', sport: { sport, customName } }) }),
    );
  }

  // Another routine instead of the planned one, for today only.
  function swap(routine: Routine, shown: Routine) {
    const choices = allRoutines.filter((other) => other.id !== shown.id);
    sheet(
      t('today.swapTitle', { name: routine.name }),
      choices.map((chosen) => ({
        label: chosen.name,
        run: () => {
          // Back to the plan: nothing to explain.
          if (chosen.id === routine.id) {
            setSwap(day, routine.id, null);
            return;
          }
          askReason(t('today.swapReasonTitle'), (reason) =>
            setSwap(day, routine.id, { routineId: chosen.id, reason }),
          );
        },
      })),
    );
  }

  // "+": any routine, unplanned (or a new one, started once it's saved),
  // or a sport done today.
  function addActivity() {
    const startable = allRoutines.filter((routine) => usesExercises(routine.label));
    sheet(t('today.addActivity'), [
      ...startable.map((routine) => ({ label: routine.name, run: () => start(routine, null) })),
      {
        label: t('workout.newRoutine'),
        run: () => router.push({ pathname: '/plan/routines/new', params: { start: '1' } }),
      },
      {
        label: t('today.logSport'),
        run: () => setLoggingSport((current) => ({ visible: true, opened: current.opened + 1 })),
      },
    ]);
  }

  // A logged activity's ⋯: "Desfés".
  function undoMenu(name: string, session: WorkoutSession) {
    sheet(name, [{ label: t('common.undo'), run: () => deleteSession.mutate(session) }]);
  }

  // Is this routine the workout going now?
  function isActive(routine: Routine, shown: Routine) {
    return (
      active?.date === day &&
      active.plannedRoutineId === routine.id &&
      active.routineId === shown.id
    );
  }

  function statusText(session: WorkoutSession): string {
    const parts =
      session.status === 'completed'
        ? [t('today.statusDone'), session.durationS ? formatDuration(session.durationS) : null]
        : [
            t('today.statusSkipped'),
            session.changeReason ? t(`workout.reasons.${session.changeReason}`) : null,
          ];
    return parts.filter(Boolean).join(' · ');
  }

  function renderHero(activity: DayActivity) {
    const session = sessionOf(activity);
    const status = session
      ? {
          label: t('today.optionsFor', { name: nameOf(activity) }),
          text: statusText(session),
          skipped: session.status === 'skipped',
          onPress: () => undoMenu(nameOf(activity), session),
        }
      : null;
    const ring = { segments, done: doneThisWeek, progress, status };

    if (activity.kind === 'sport') {
      const name = nameOf(activity);
      return (
        <TodayHero
          {...ring}
          name={name}
          insteadOf={null}
          details={detailsOf(activity)}
          main={
            session
              ? null
              : {
                  kind: 'done',
                  caption: t('today.done'),
                  aria: t('today.doneFor', { name }),
                  onPress: () => markDone(activity),
                }
          }
          actions={
            session
              ? []
              : [
                  {
                    aria: t('today.skipFor', { name }),
                    icon: 'forward.end',
                    onPress: () => skip(activity),
                  },
                ]
          }
        />
      );
    }

    const { routine } = activity;
    const shown = shownFor(routine, session);
    const startable = usesExercises(shown.label);
    const going = isActive(routine, shown);
    const actions: HeroAction[] = session
      ? []
      : [
          ...(startable && shown.exercises.length > 0
            ? [
                {
                  aria: t('today.previewFor', { name: shown.name }),
                  icon: 'eye' as const,
                  onPress: () => setPreviewing({ routine: shown, planned: routine }),
                },
              ]
            : []),
          {
            aria: t('today.swapFor', { name: shown.name }),
            icon: 'arrow.left.arrow.right',
            onPress: () => swap(routine, shown),
          },
          {
            aria: t('today.skipFor', { name: shown.name }),
            icon: 'forward.end',
            onPress: () => skipRoutine(activity),
          },
        ];
    return (
      <TodayHero
        {...ring}
        name={shown.name}
        insteadOf={shown.id !== routine.id ? t('today.insteadOf', { name: routine.name }) : null}
        details={detailsOf(activity, shown)}
        main={
          session
            ? null
            : startable
              ? {
                  kind: 'go',
                  caption: going ? t('workout.resume') : t('today.goCaption'),
                  aria: t('workout.startFor', { name: shown.name }),
                  onPress: () => (going ? router.push('/workout') : start(shown, routine.id)),
                }
              : {
                  // A class: marked done, not started.
                  kind: 'done',
                  caption: t('today.done'),
                  aria: t('today.doneFor', { name: shown.name }),
                  onPress: () => markDone(activity),
                }
        }
        actions={actions}
      />
    );
  }

  const alsoToday: AlsoTodayItem[] = others.map((activity) => {
    const session = sessionOf(activity);
    const state = !session ? 'open' : session.status === 'skipped' ? 'skipped' : 'done';
    const check = () => (session ? undoMenu(nameOf(activity), session) : markDone(activity));
    if (activity.kind === 'sport') {
      const name = nameOf(activity);
      const { startTime, durationS } = activity.sport;
      return {
        key: activity.key,
        icon: SPORT_ICONS[activity.sport.sport],
        time: startTime,
        name,
        details: session ? statusText(session) : durationS ? formatDuration(durationS) : '',
        state,
        onCheck: check,
        onPress: () =>
          session
            ? undoMenu(name, session)
            : sheet(name, [{ label: t('today.skip'), run: () => skip(activity) }]),
      };
    }
    const { routine } = activity;
    const shown = shownFor(routine, session);
    const going = isActive(routine, shown);
    return {
      key: activity.key,
      icon: ROUTINE_ICONS[shown.label],
      time: null,
      name: shown.name,
      details: session ? statusText(session) : detailsOf(activity, shown),
      state,
      onCheck: check,
      onPress: () =>
        session
          ? undoMenu(shown.name, session)
          : sheet(shown.name, [
              ...(usesExercises(shown.label)
                ? [
                    {
                      label: going ? t('workout.resume') : t('workout.start'),
                      run: () => (going ? router.push('/workout') : start(shown, routine.id)),
                    },
                    {
                      label: t('today.preview'),
                      run: () => setPreviewing({ routine: shown, planned: routine }),
                    },
                  ]
                : []),
              { label: t('today.swap'), run: () => swap(routine, shown) },
              { label: t('today.skip'), run: () => skipRoutine(activity) },
            ]),
    };
  });

  // Done today without being planned: from +, or a rest day's walk.
  const unplanned: AlsoTodayItem[] = sessions
    .filter(
      (session) =>
        session.date === day &&
        session.status === 'completed' &&
        session.plannedRoutineId === null &&
        session.plannedSportId === null,
    )
    .map((session) => {
      const routine = allRoutines.find((other) => other.id === session.routineId);
      const name = session.sport
        ? nameOf({ kind: 'sport', sport: { sport: session.sport, customName: session.sportName } })
        : (routine?.name ??
          pending.find((workout) => workout.id === session.id)?.routineName ??
          t('history.noRoutine'));
      return {
        key: `session:${session.id}`,
        icon: session.sport ? SPORT_ICONS[session.sport] : ROUTINE_ICONS[routine?.label ?? 'strength'],
        time: null,
        name,
        details: statusText(session),
        state: 'done',
        onCheck: () => undoMenu(name, session),
        onPress: () => undoMenu(name, session),
      };
    });

  // A rest day: what's next, "Demà" or its weekday, as
  // "Tren inferior 1 · Pàdel 19:00".
  const next = nextPlannedDay(routines, sports, today, moves);
  const nextPlan = next && {
    day: next.inDays === 1 ? t('today.tomorrow') : t(`weekdays.long.${next.weekday}`),
    plan: next.activities
      .map((activity) =>
        activity.kind === 'sport' && activity.sport.startTime
          ? `${nameOf(activity)} ${activity.sport.startTime}`
          : nameOf(activity),
      )
      .join(' · '),
  };

  // "Reprograma la setmana…": today to Sunday, each day's sports (they
  // stay) and the routines still to do, each known by the day it's planned
  // on. Today's logged ones and the one going stay put. From the nudge,
  // yesterday's missed one starts under today.
  const reprogramDays: ReprogramDay[] = [];
  const reprogramRoutines: ReprogramRoutine[] = [];
  const reprogramPlanned = new Map<string, { planned: PlannedRoutine; was: string }>();
  const reprogramMissed = reprogramming?.missed;
  if (reprogramMissed) {
    const planned = plannedRoutineOf(reprogramMissed, yesterdayKey);
    const id = `${planned.plannedDate}:${planned.routineId}`;
    reprogramPlanned.set(id, { planned, was: yesterdayKey });
    reprogramRoutines.push({
      key: id,
      date: day,
      name: reprogramMissed.routine.name,
      icon: ROUTINE_ICONS[reprogramMissed.routine.label],
    });
  }
  for (let date = today, index = 0; date.getTime() <= weekEnd.getTime(); index += 1) {
    const key = dateKey(date);
    const activities = activitiesOnDate(allRoutines, sports, moves, date);
    reprogramDays.push({
      date: key,
      title:
        index === 0
          ? t('tabs.today')
          : index === 1
            ? t('today.tomorrow')
            : t(`weekdays.long.${weekdayOf(date)}`),
      sports: activities.flatMap((activity) =>
        activity.kind === 'sport'
          ? [[nameOf(activity), activity.sport.startTime].filter(Boolean).join(' ')]
          : [],
      ),
    });
    for (const activity of activities) {
      if (activity.kind !== 'routine' || isLogged(activity, key)) continue;
      const planned = plannedRoutineOf(activity, key);
      const id = `${planned.plannedDate}:${planned.routineId}`;
      reprogramPlanned.set(id, { planned, was: key });
      reprogramRoutines.push({
        key: id,
        date: key,
        name: activity.routine.name,
        icon: ROUTINE_ICONS[activity.routine.label],
      });
    }
    date = addDays(date, 1);
  }

  function saveReprogram(placed: { key: string; date: string }[]) {
    setReprogramming(null);
    const changes = placed.flatMap(({ key, date }) => {
      const item = reprogramPlanned.get(key);
      return item && item.was !== date ? [{ ...item, now: date }] : [];
    });
    if (changes.length === 0) return;
    changeWeek(rearranged(allRoutines, sports, moves, changes), t('today.reprogrammed'));
  }

  return (
    <View style={styles.today}>
      {header}
      {active ? <ResumeBanner workout={active} /> : null}
      {missed ? (
        <MissedDay
          name={missed.routine.name}
          onDoToday={() => doMissedToday(missed)}
          onOtherOptions={() => missedOptions(missed)}
        />
      ) : null}
      <StepsCard today={today} />

      {allRoutines.length === 0 && sports.length === 0 ? (
        <Card>
          <Text color="textMuted">{t('schedule.noRoutines')}</Text>
        </Card>
      ) : weekIsEmpty ? (
        <Card>
          <Text color="textMuted">{t('today.noWeek')}</Text>
        </Card>
      ) : allDone ? (
        <DayDone
          segments={segments}
          done={doneThisWeek}
          progress={progress}
          timeS={doneToday.reduce((total, entry) => total + (entry.durationS ?? 0), 0)}
          volumeKg={doneToday.reduce((total, entry) => total + entry.volumeKg, 0)}
          beats={beats}
        />
      ) : main ? (
        renderHero(main)
      ) : (
        <RestDay
          today={today}
          next={nextPlan}
          onLog={(sport) => setLogging({ kind: 'recovery', sport })}
        />
      )}

      <AlsoToday items={[...alsoToday, ...unplanned]} onAdd={addActivity} />

      <QuickLogSheet
        visible={logging !== null}
        routineName={
          logging?.kind === 'sport'
            ? nameOf({ kind: 'sport', sport: logging.sport })
            : logging?.kind === 'recovery'
              ? t(`sports.${logging.sport}`)
              : (logging?.shown.name ?? '')
        }
        plannedDurationS={
          logging?.kind === 'sport'
            ? logging.sport.durationS
            : logging?.kind === 'recovery'
              ? null
              : (logging?.shown.plannedDurationS ?? null)
        }
        onCancel={() => setLogging(null)}
        onSave={saveDone}
      />
      <RoutinePreviewSheet
        routine={previewing?.routine ?? null}
        visible={previewing !== null}
        onClose={() => setPreviewing(null)}
        onStart={
          previewing
            ? () => {
                const { routine, planned: plannedRoutine } = previewing;
                setPreviewing(null);
                start(routine, plannedRoutine.id);
              }
            : undefined
        }
      />
      <ReprogramSheet
        visible={reprogramming !== null}
        days={reprogramDays}
        routines={reprogramRoutines}
        onClose={() => setReprogramming(null)}
        onSave={saveReprogram}
      />
      <LogSportSheet
        key={loggingSport.opened}
        visible={loggingSport.visible}
        onClose={() => setLoggingSport((current) => ({ ...current, visible: false }))}
        onSave={saveSport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  today: {
    gap: spacing.lg,
  },
});
