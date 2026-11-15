import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import { Button, Card, SegmentedControl, Text, useActionSheet, useToast } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { APP_DEFAULT_REST_S } from '@/features/exercises/rest';
import {
  formatDuration,
  routineDuration,
  WEEKDAYS,
  type Routine,
  type Weekday,
} from '@/features/routines/routine';
import { ROUTINE_ICONS } from '@/features/routines/routineIcons';
import { useRoutines } from '@/features/routines/useRoutines';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { useWeekSessions } from '@/features/workout/useSessions';

import { ActivitySheet, type ActivitySheetMode } from './ActivitySheet';
import { addDays, dateKey, startOfWeek, weekdayOf } from './dates';
import { plannedRoutineOf, withMove, type Move } from './moves';
import { SPORT_ICONS, type WeeklySport } from './sports';
import { useActivityName } from './useActivityName';
import { useToday } from './useToday';
import { useAddToDay, useMoveToDay, useRemoveFromDay } from './useWeekSchedule';
import { useSetWeekMoves, useWeekMoves } from './useWeekMoves';
import { WeekStrip, type StripDay } from './WeekStrip';
import {
  useAddSport,
  useMoveSport,
  useRemoveSport,
  useReorderDay,
  useUpdateSport,
  useWeeklySports,
} from './useWeeklySports';
import {
  activitiesOnDate,
  activitiesOnDay,
  nextDayPosition,
  weekSummary,
  type DayActivity,
} from './week';

// The usual week, this week or the next one.
type WeekView = 'usual' | 'this' | 'next';

function openRoutine(routine: Routine) {
  router.push({ pathname: '/plan/routines/[id]', params: { id: routine.id } });
}

// Plan → Setmana (US-09): "La teva setmana", your usual week, Monday to
// Sunday. First the whole week at a glance (WeekStrip): a tap on a day
// scrolls down to it, and a line held and dragged to another day moves it
// there. Then, under a divider, day by day: each day's routines and sports
// in the order you drag them into; drag one onto another day's card to
// move it (or use its menu: "Mou a un altre dia…"). "+ Afegeix" adds
// either. A day with neither is a rest day.
//
// Over it all: Habitual | Aquesta setmana | La setmana que ve. A dated
// week starts from the usual one; moving or taking off a routine there
// changes that week only (its moves, as Avui's "Salta" makes), and "Torna
// a l'habitual" undoes them all. A routine can't go to a day already gone,
// nor leave one where it's been done. Sports, and adding things just for
// one week, stay in the usual week for now.
export function WeekSchedule({
  onScrollTo,
  scrollableRef,
  onDragChange,
}: {
  onScrollTo?: (y: number) => void;
  // A line in the strip lifted or let go: the screen keeps still meanwhile.
  onDragChange?: (dragging: boolean) => void;
  // The screen's ScrollView, which scrolls by itself while a row is
  // dragged to its edge.
  scrollableRef?: AnimatedRef<Animated.ScrollView>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const showToast = useToast();
  const nameOf = useActivityName();
  const language = useAppLanguage();
  const todayDate = useToday();
  const today = weekdayOf(todayDate);
  const todayKey = dateKey(todayDate);
  const [view, setView] = useState<WeekView>('usual');
  const dated = view !== 'usual';
  // The dated week shown (this one while on Habitual: fetched, not shown).
  const weekStart = addDays(startOfWeek(todayDate), view === 'next' ? 7 : 0);
  const weekEnd = addDays(weekStart, 6);
  const from = dateKey(weekStart);
  const to = dateKey(weekEnd);
  const { data: moves = [] } = useWeekMoves(from, to);
  const setMoves = useSetWeekMoves(from, to);
  const { data: sessions = [] } = useWeekSessions(from, to);
  const { data: routines, isPending, isError } = useRoutines();
  const { data: sports = [] } = useWeeklySports();
  const addToDay = useAddToDay();
  const removeFromDay = useRemoveFromDay();
  const addSport = useAddSport();
  const updateSport = useUpdateSport();
  const removeSport = useRemoveSport();
  const reorderDay = useReorderDay();
  const moveToDay = useMoveToDay();
  const moveSport = useMoveSport();
  // The row being dragged in the list, and the day card it's over.
  const dragging = useRef<{ activity: DayActivity; day: Weekday } | null>(null);
  // On the UI thread, so marking it re-renders nothing mid-drag. 0: none.
  const overDay = useSharedValue<number>(0);
  // The add/edit sheet: what it's for, whether it's showing, and a count
  // that gives each opening a fresh start.
  const [sheet, setSheet] = useState<{ mode: ActivitySheetMode; visible: boolean; opened: number }>(
    { mode: { kind: 'add', day: 1 }, visible: false, opened: 0 },
  );
  // Where the week and each day's card are: the week within the screen's
  // scroll, each day within the week. For a tap in the strip, and for how
  // far a dragged row may scroll the screen.
  const [week, setWeek] = useState({ y: 0, height: 0 });
  const [dayBoxes, setDayBoxes] = useState<Partial<Record<Weekday, { y: number; height: number }>>>(
    {},
  );

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;

  const summary = weekSummary(routines, sports);
  // Loaded by now; named again because TypeScript forgets that inside the
  // functions below.
  const planned = routines;
  const sheetDay = sheet.mode.kind === 'add' ? sheet.mode.day : sheet.mode.sport.weekday;
  const dateOf = (day: Weekday) => addDays(weekStart, day - 1);
  // Monday to Sunday, as the view shows them.
  const days = WEEKDAYS.map((day) => {
    const date = dateOf(day);
    const key = dateKey(date);
    return {
      day,
      date,
      key,
      activities: dated
        ? activitiesOnDate(planned, sports, moves, date)
        : activitiesOnDay(planned, sports, day),
      isToday: dated ? key === todayKey : day === today,
      past: dated && key < todayKey,
    };
  });
  const dayOf = (day: Weekday) => days[day - 1];
  // This week's own changes.
  const changes = moves.filter((move) => move.plannedDate >= from && move.plannedDate <= to);
  const stripDays: StripDay[] = days.map(({ day, date, activities, isToday }) => ({
    day,
    title: dated ? `${t(`weekdays.short.${day}`)} ${date.getDate()}` : t(`weekdays.short.${day}`),
    activities,
    isToday,
  }));
  // "17–23 de novembre", or across two months "29 de setembre – 5 d'octubre".
  const dayMonth = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' });
  const range =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()}–${dayMonth.format(weekEnd)}`
      : `${dayMonth.format(weekStart)} – ${dayMonth.format(weekEnd)}`;

  function open(mode: ActivitySheetMode) {
    setSheet((current) => ({ mode, visible: true, opened: current.opened + 1 }));
  }

  function remove(activity: DayActivity, day: Weekday) {
    const dayName = t(`weekdays.long.${day}`);
    const name = nameOf(activity);
    if (activity.kind === 'routine') {
      const entry = {
        routineId: activity.routine.id,
        weekday: day,
        position: activity.routine.dayPositions[day] ?? 0,
      };
      removeFromDay.mutate(entry);
      showToast({
        message: t('schedule.removed', { day: dayName, name }),
        action: { label: t('common.undo'), onPress: () => addToDay.mutate(entry) },
      });
    } else {
      const sport = activity.sport;
      removeSport.mutate(sport);
      showToast({
        message: t('schedule.removed', { day: dayName, name }),
        action: { label: t('common.undo'), onPress: () => addSport.mutate(sport) },
      });
    }
  }

  // How far past a day's own rows the screen may scroll while one is
  // dragged: up to the top of the screen, down to the end of the week.
  function dragReach(day: Weekday): [number, number] {
    const box = dayBoxes[day];
    if (!box) return [0, 0];
    return [week.y + box.y + touch.min, Math.max(week.height - box.y - box.height, 0)];
  }

  // To another day, at the end of it, with "Desfés" back to where it was.
  // A routine can't go to a day that already has it.
  function move(activity: DayActivity, from: Weekday, to: Weekday) {
    if (from === to) return;
    const name = nameOf(activity);
    const toName = t(`weekdays.long.${to}`);
    const position = nextDayPosition(planned, sports, to);
    if (activity.kind === 'routine') {
      const { routine } = activity;
      if (routine.weekdays.includes(to)) {
        showToast({ message: t('schedule.alreadyOn', { day: toName, name }) });
        return;
      }
      const back = { routineId: routine.id, from: to, to: from, position: routine.dayPositions[from] ?? 0 };
      moveToDay.mutate({ routineId: routine.id, from, to, position });
      showToast({
        message: t('schedule.moved', { day: toName, name }),
        action: { label: t('common.undo'), onPress: () => moveToDay.mutate(back) },
      });
    } else {
      const { sport } = activity;
      moveSport.mutate({ id: sport.id, weekday: to, position });
      showToast({
        message: t('schedule.moved', { day: toName, name }),
        action: {
          label: t('common.undo'),
          onPress: () =>
            moveSport.mutate({ id: sport.id, weekday: from, position: sport.position }),
        },
      });
    }
  }

  // A change to the dated week only, with "Desfés" to put it back.
  function changeWeek(next: Move[], message: string) {
    const previous = moves;
    setMoves.mutate(next);
    showToast({
      message,
      action: { label: t('common.undo'), onPress: () => setMoves.mutate(previous) },
    });
  }

  // Done that day already: it stays where it was done.
  function isDone(activity: DayActivity, day: Weekday): boolean {
    return (
      activity.kind === 'routine' &&
      sessions.some(
        (session) =>
          session.date === dayOf(day).key && session.plannedRoutineId === activity.routine.id,
      )
    );
  }

  // Whether it can be dragged: anything in the usual week; in a dated
  // week, a routine still to do, from today on.
  function canDrag(activity: DayActivity, day: Weekday): boolean {
    return !dated || (activity.kind === 'routine' && !dayOf(day).past && !isDone(activity, day));
  }

  // In a dated week: a routine to another day of it, from today on, not one
  // that has it already.
  function moveInWeek(activity: DayActivity, from: Weekday, to: Weekday) {
    if (from === to) return;
    if (activity.kind !== 'routine') {
      showToast({ message: t('schedule.sportsInUsualWeek') });
      return;
    }
    const name = nameOf(activity);
    const toName = t(`weekdays.long.${to}`);
    if (dayOf(to).past) {
      showToast({ message: t('schedule.dayGone', { day: toName }) });
      return;
    }
    if (isDone(activity, from)) {
      showToast({ message: t('schedule.alreadyDone', { name }) });
      return;
    }
    if (
      dayOf(to).activities.some(
        (other) => other.kind === 'routine' && other.routine.id === activity.routine.id,
      )
    ) {
      showToast({ message: t('schedule.alreadyOn', { day: toName, name }) });
      return;
    }
    changeWeek(
      withMove(
        moves,
        plannedRoutineOf(activity, dayOf(from).key),
        dayOf(to).key,
        nextDayPosition(planned, sports, to),
      ),
      t('schedule.moved', { day: toName, name }),
    );
  }

  // In a dated week: off it, that week only.
  function dropFromWeek(activity: DayActivity, day: Weekday) {
    if (activity.kind !== 'routine') return;
    const name = nameOf(activity);
    if (isDone(activity, day)) {
      showToast({ message: t('schedule.alreadyDone', { name }) });
      return;
    }
    changeWeek(
      withMove(moves, plannedRoutineOf(activity, dayOf(day).key), null),
      t('schedule.droppedThisWeek', { day: t(`weekdays.long.${day}`), name }),
    );
  }

  // The move this view makes.
  const moveActivity = dated ? moveInWeek : move;

  // "Mou a un altre dia…": the days it isn't on yet (in a dated week, from
  // today on).
  function moveMenu(activity: DayActivity, from: Weekday) {
    const targets = WEEKDAYS.filter((day) => {
      if (day === from) return false;
      if (activity.kind !== 'routine') return true;
      if (!dated) return !activity.routine.weekdays.includes(day);
      return (
        !dayOf(day).past &&
        !dayOf(day).activities.some(
          (other) => other.kind === 'routine' && other.routine.id === activity.routine.id,
        )
      );
    });
    showActionSheet(
      {
        title: t('schedule.moveTitle', { name: nameOf(activity) }),
        options: [...targets.map((day) => t(`weekdays.long.${day}`)), t('common.cancel')],
        cancelButtonIndex: targets.length,
      },
      (index) => {
        const to = targets[index];
        if (to) moveActivity(activity, from, to);
      },
    );
  }

  // A dated week's menu: a routine opens, moves or comes off that week; a
  // sport is changed in the usual week.
  function datedMenu(activity: DayActivity, day: Weekday) {
    if (activity.kind === 'sport') {
      showActionSheet(
        {
          title: nameOf(activity),
          message: t('schedule.sportsInUsualWeek'),
          options: [t('schedule.toUsualWeek'), t('common.cancel')],
          cancelButtonIndex: 1,
        },
        (index) => {
          if (index === 0) setView('usual');
        },
      );
      return;
    }
    const changeable = !dayOf(day).past && !isDone(activity, day);
    const actions = [
      { label: t('schedule.open'), run: () => openRoutine(activity.routine) },
      ...(changeable
        ? [
            { label: t('schedule.moveTo'), run: () => moveMenu(activity, day) },
            { label: t('schedule.dropThisWeek'), run: () => dropFromWeek(activity, day) },
          ]
        : []),
    ];
    showActionSheet(
      {
        title: nameOf(activity),
        options: [...actions.map((action) => action.label), t('common.cancel')],
        cancelButtonIndex: actions.length,
      },
      (index) => actions[index]?.run(),
    );
  }

  // Tap an activity: open the routine or change the sport's time, move it
  // to another day, or take it off the day (with "Desfés", so it isn't
  // shown as destructive).
  function openMenu(activity: DayActivity, day: Weekday) {
    if (dated) {
      datedMenu(activity, day);
      return;
    }
    const first =
      activity.kind === 'routine'
        ? { label: t('schedule.open'), run: () => openRoutine(activity.routine) }
        : { label: t('schedule.changeTime'), run: () => open({ kind: 'edit', sport: activity.sport }) };
    showActionSheet(
      {
        title: nameOf(activity),
        options: [first.label, t('schedule.moveTo'), t('schedule.remove'), t('common.cancel')],
        cancelButtonIndex: 3,
      },
      (index) => {
        if (index === 0) first.run();
        if (index === 1) moveMenu(activity, day);
        if (index === 2) remove(activity, day);
      },
    );
  }

  return (
    <GestureHandlerRootView
      style={styles.week}
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        // Only when it changes: no re-render mid-drag for nothing.
        setWeek((current) =>
          current.y === y && current.height === height ? current : { y, height },
        );
      }}>
      <SegmentedControl
        label={t('schedule.whichWeek')}
        options={[
          { value: 'usual', label: t('schedule.views.usual') },
          { value: 'this', label: t('schedule.views.this') },
          { value: 'next', label: t('schedule.views.next') },
        ]}
        value={view}
        onChange={setView}
      />

      {dated ? (
        <View>
          <Text variant="label" color="textMuted" accessibilityRole="header">
            {t(view === 'this' ? 'schedule.thisWeekOf' : 'schedule.nextWeekOf', { range })}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('schedule.datedNote')}
          </Text>
        </View>
      ) : (
        <View>
          <Text variant="label" color="textMuted" accessibilityRole="header">
            {t('schedule.usualWeek')}
          </Text>
          <Text variant="caption" color="textMuted">
            {[
              t('schedule.workouts', { count: summary.workouts }),
              t('schedule.sports', { count: summary.sports }),
              t('schedule.restDays', { count: summary.restDays }),
            ].join(' · ')}
            {'. '}
            {t('schedule.repeats')}
          </Text>
        </View>
      )}

      {dated && changes.length > 0 ? (
        <Card raised style={styles.changes}>
          <Text variant="captionMedium" style={styles.changesText}>
            {t('schedule.changes', { count: changes.length })}
          </Text>
          <Button
            label={t('schedule.backToUsual')}
            variant="ghost"
            onPress={() =>
              changeWeek(
                moves.filter((move) => move.plannedDate < from || move.plannedDate > to),
                t('schedule.backToUsualDone'),
              )
            }
          />
        </Card>
      ) : null}

      <WeekStrip
        days={stripDays}
        canDrag={canDrag}
        onDayPress={(day) => onScrollTo?.(week.y + (dayBoxes[day]?.y ?? 0))}
        onMove={moveActivity}
        onDragChange={onDragChange}
      />

      {/* The week at a glance above, day by day below. */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {t('schedule.dayByDay')}
      </Text>

      <Sortable.MultiZoneProvider>

        {days.map(({ day, date, activities, isToday }) => {
          const dayName = dated
            ? `${t(`weekdays.long.${day}`)} ${date.getDate()}`
            : t(`weekdays.long.${day}`);
          const rest = activities.length === 0;
          return (
            <Sortable.BaseZone
              key={day}
              onLayout={(event) => {
                const { y, height } = event.nativeEvent.layout;
                setDayBoxes((current) =>
                  current[day]?.y === y && current[day]?.height === height
                    ? current
                    : { ...current, [day]: { y, height } },
                );
              }}
              // Not its own day: nothing would move.
              onItemEnter={() => {
                if (dragging.current?.day !== day) overDay.set(day);
              }}
              onItemLeave={() => {
                if (overDay.get() === day) overDay.set(0);
              }}
              onItemDrop={() => {
                overDay.set(0);
                const dragged = dragging.current;
                dragging.current = null;
                if (dragged && dragged.day !== day) {
                  moveActivity(dragged.activity, dragged.day, day);
                }
              }}>
              <Card
                style={[
                  styles.day,
                  rest && [styles.restDay, { borderColor: colors.control }],
                ]}>
                <DropRing day={day} over={overDay} />
                <View style={styles.dayHeader}>
                  <Text variant="label" color="textMuted" accessibilityRole="header">
                    {dayName}
                  </Text>
                  {rest ? (
                    <View style={styles.restTag}>
                      <SymbolView name="moon" size={14} weight="light" tintColor={colors.textMuted} />
                      <Text variant="caption" color="textMuted">
                        {t('schedule.restDay')}
                      </Text>
                    </View>
                  ) : activities.length > 1 ? (
                    <Text variant="caption" color="textMuted">
                      {t('schedule.activities', { count: activities.length })}
                    </Text>
                  ) : null}
                  {isToday ? (
                    <View style={[styles.todayTag, { backgroundColor: colors.accent }]}>
                      <Text variant="label" color="onAccent">
                        {t('schedule.today')}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.spacer} />
                  {/* Adding just for one week comes later: the usual week's. */}
                  {dated ? null : (
                    <Pressable
                      role="button"
                      aria-label={t('schedule.addFor', { day: dayName })}
                      onPress={() => open({ kind: 'add', day })}
                      hitSlop={8}
                      style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
                      <Text variant="bodyStrong" color="accent">
                        {t('schedule.add')}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {rest ? null : (
                  <Sortable.Grid
                    data={activities}
                    keyExtractor={(activity) => activity.key}
                    renderItem={({ item }) => (
                      <ActivityRow
                        activity={item}
                        dayName={dayName}
                        // Its handle drags it within the day or to another.
                        draggable={canDrag(item, day)}
                        onPress={() => openMenu(item, day)}
                      />
                    )}
                    onDragEnd={({ fromIndex, toIndex }) => {
                      // A dated week keeps the usual order within a day.
                      if (dated || fromIndex === toIndex) return;
                      const order = [...activities];
                      const [moved] = order.splice(fromIndex, 1);
                      order.splice(toIndex, 0, moved);
                      reorderDay.mutate({ day, order });
                    }}
                    onDragStart={({ fromIndex }) => {
                      const activity = activities[fromIndex];
                      dragging.current = activity ? { activity, day } : null;
                    }}
                    // Only the handle starts a drag, so scrolling never moves anything.
                    customHandle
                    scrollableRef={scrollableRef}
                    // A row dragged to the screen's edge scrolls it, as far as
                    // the week goes (by default only a little past its own
                    // day), so Monday's can reach Friday.
                    autoScrollMaxOverscroll={dragReach(day)}
                    rowGap={0}
                  />
                )}
              </Card>
            </Sortable.BaseZone>
          );
        })}
      </Sortable.MultiZoneProvider>

      <ActivitySheet
        key={sheet.opened}
        mode={sheet.mode}
        visible={sheet.visible}
        routines={routines.filter((routine) => !routine.weekdays.includes(sheetDay))}
        anyRoutines={routines.length > 0}
        onClose={() => setSheet((current) => ({ ...current, visible: false }))}
        onCreateRoutine={(day) => {
          setSheet((current) => ({ ...current, visible: false }));
          router.push({ pathname: '/plan/routines/new', params: { weekday: String(day) } });
        }}
        onAddRoutine={(routine, day) =>
          addToDay.mutate({
            routineId: routine.id,
            weekday: day,
            position: nextDayPosition(routines, sports, day),
          })
        }
        onSaveSport={(sport: WeeklySport) => {
          if (sheet.mode.kind === 'edit') {
            updateSport.mutate({
              id: sport.id,
              change: { startTime: sport.startTime, durationS: sport.durationS },
            });
          } else {
            addSport.mutate({ ...sport, position: nextDayPosition(routines, sports, sport.weekday) });
          }
        }}
      />
    </GestureHandlerRootView>
  );
}

// The ring on the day card a dragged row is over.
function DropRing({ day, over }: { day: Weekday; over: SharedValue<number> }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({ opacity: over.get() === day ? 1 : 0 }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.dropRing, { borderColor: colors.accent }, style]}
    />
  );
}

// One planned activity: its icon (a routine's tinted, a sport's outlined),
// its name, and what it is: "Rutina · Esquena i bíceps · ~1 h 30 min" or
// "Esport · 19:00 · 1 h 30 min". The handle drags it within the day.
function ActivityRow({
  activity,
  dayName,
  draggable,
  onPress,
}: {
  activity: DayActivity;
  dayName: string;
  draggable: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const nameOf = useActivityName();
  const name = nameOf(activity);

  let details: (string | null)[];
  if (activity.kind === 'routine') {
    const { routine } = activity;
    const duration = routineDuration(routine, APP_DEFAULT_REST_S);
    const about =
      routine.description ??
      (routine.exercises.length > 0
        ? routine.exercises
            .slice(0, 3)
            .map((item) => exerciseName(item.exercise, language))
            .join(', ')
        : null);
    details = [
      t('schedule.routine'),
      about,
      duration
        ? `${duration.estimated ? '~' : ''}${formatDuration(duration.seconds)}`
        : null,
    ];
  } else {
    details = [
      t('schedule.sport'),
      activity.sport.startTime,
      activity.sport.durationS ? formatDuration(activity.sport.durationS) : null,
    ];
  }

  return (
    <View style={styles.row}>
      <Pressable
        role="button"
        aria-label={t('schedule.menuFor', { name, day: dayName })}
        onPress={onPress}
        style={({ pressed }) => [styles.activity, pressed && styles.pressed]}>
        <View
          style={[
            styles.icon,
            activity.kind === 'routine'
              ? { backgroundColor: colors.accentSoft }
              : { borderWidth: 1.5, borderColor: colors.control },
          ]}>
          <SymbolView
            name={
              activity.kind === 'routine'
                ? ROUTINE_ICONS[activity.routine.label]
                : SPORT_ICONS[activity.sport.sport]
            }
            size={20}
            weight="light"
            tintColor={activity.kind === 'routine' ? colors.accent : colors.textSecondary}
          />
        </View>
        <View style={styles.text}>
          <Text variant="name" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {details.filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Pressable>
      {draggable ? (
        <Sortable.Handle>
          <View
            style={styles.handle}
            aria-label={t('schedule.dragHandle', { name })}
            accessibilityHint={t('schedule.dragHint')}>
            <SymbolView
              name="line.3.horizontal"
              size={18}
              weight="light"
              tintColor={colors.textMuted}
            />
          </View>
        </Sortable.Handle>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    gap: spacing.md,
  },
  // Between the week at a glance and the list.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  // Around the card a dragged row would land on; it takes no room, so
  // nothing below it moves.
  changes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  changesText: {
    flex: 1,
  },
  dropRing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  day: {
    gap: spacing.xs,
  },
  // A gap in the week: an outline on the page, not a raised card.
  restDay: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    boxShadow: [],
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
  },
  restTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  todayTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  spacer: {
    flex: 1,
  },
  add: {
    minHeight: touch.min,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingVertical: spacing.xs,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  handle: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
