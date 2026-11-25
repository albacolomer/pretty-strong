import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
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

import { Button, Card, IconButton, Text, useActionSheet, useToast, Icon } from '@/components/ui';
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

import { ActivitySheet, type ActivitySheetMode, type Scope } from './ActivitySheet';
import { withAdditionMoved, type Addition } from './additions';
import { addDays, dateKey, startOfWeek } from './dates';
import { plannedRoutineOf, withPlannedMove, type WeekPlan } from './moves';
import { SPORT_ICONS, type WeeklySport } from './sports';
import { useActivityName } from './useActivityName';
import { useToday } from './useToday';
import { useAddToDay, useMoveToDay, useRemoveFromDay } from './useWeekSchedule';
import { useChangeWeek, useWeekPlan } from './useWeekPlan';
import { WeekStrip, type StripDay } from './WeekStrip';
import {
  useAddSport,
  useMoveSport,
  useRemoveSport,
  useReorderDay,
  useUpdateSport,
  useWeeklySports,
} from './useWeeklySports';
import { activitiesOnDate, nextDatePosition, nextDayPosition, type DayActivity } from './week';

// How far ahead the arrows go: this week and the next four. Further would
// be a program (weeks and progressions), out of scope for Phase 1.
const WEEKS_AHEAD = 4;

function openRoutine(routine: Routine) {
  router.push({ pathname: '/plan/routines/[id]', params: { id: routine.id } });
}

// Plan → Setmana (US-09, US-29): a real week, Monday to Sunday, with its
// dates; ‹ › go from this week up to four ahead. First the whole week at a
// glance (WeekStrip): a tap on a day scrolls down to it, and a line held
// and dragged to another day moves it there. Then, under a divider, day by
// day: each day's routines and sports; drag one onto another day's card to
// move it (or use its menu: "Mou a un altre dia…"). "+ Afegeix" adds
// either. A day with neither is a rest day.
//
// Each week starts as your usual one (weekly_schedule and weekly_sports),
// so someone who always does the same just never changes it. Adding,
// moving or taking something off asks whether it's for that week only (its
// moves, additions and sport drops) or every week (the usual one).
// "Desfés els canvis" undoes that week's own.
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
  const todayKey = dateKey(todayDate);
  // Weeks from this one: 0 is this week.
  const [offset, setOffset] = useState(0);
  const weekStart = addDays(startOfWeek(todayDate), 7 * offset);
  const weekEnd = addDays(weekStart, 6);
  const from = dateKey(weekStart);
  const to = dateKey(weekEnd);
  const { plan } = useWeekPlan(from, to);
  const { moves, additions, drops } = plan;
  const changeWeekPlan = useChangeWeek(from, to);
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

  // Loaded by now; named again because TypeScript forgets that inside the
  // functions below.
  const planned = routines;
  const sheetDay = sheet.mode.kind === 'add' ? sheet.mode.day : sheet.mode.sport.weekday;
  // Monday to Sunday, with that week's changes.
  const days = WEEKDAYS.map((day) => {
    const date = addDays(weekStart, day - 1);
    const key = dateKey(date);
    return {
      day,
      date,
      key,
      activities: activitiesOnDate(planned, sports, moves, date, additions, drops),
      isToday: key === todayKey,
    };
  });
  const dayOf = (day: Weekday) => days[day - 1];
  // That week's own changes.
  const ownMoves = moves.filter((move) => move.plannedDate >= from && move.plannedDate <= to);
  const changed = ownMoves.length + additions.length + drops.length > 0;
  const stripDays: StripDay[] = days.map(({ day, date, activities, isToday }) => ({
    day,
    title: `${t(`weekdays.short.${day}`)} ${date.getDate()}`,
    activities,
    isToday,
  }));
  const all = days.flatMap(({ activities }) => activities);
  const summary = [
    t('schedule.workouts', { count: all.filter((activity) => activity.kind === 'routine').length }),
    t('schedule.sports', { count: all.filter((activity) => activity.kind === 'sport').length }),
    t('schedule.restDays', {
      count: days.filter(({ activities }) => activities.length === 0).length,
    }),
  ].join(' · ');
  // "17–23 de novembre", or across two months "29 de setembre – 5 d'octubre".
  // "Nov 23 – Nov 29", "23 nov – 29 nov": the short month on both ends.
  const dayMonth = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' });
  const range = `${dayMonth.format(weekStart)} – ${dayMonth.format(weekEnd)}`;
  const weekTitle =
    offset === 0
      ? t('schedule.thisWeek')
      : offset === 1
        ? t('schedule.nextWeek')
        : t('schedule.inWeeks', { count: offset });

  function open(mode: ActivitySheetMode) {
    setSheet((current) => ({ mode, visible: true, opened: current.opened + 1 }));
  }

  function changeWeek(next: WeekPlan, message: string) {
    changeWeekPlan(plan, next, message);
  }

  // "Només aquesta setmana" or "Cada setmana", before a change.
  function askScope(title: string, run: (scope: Scope) => void) {
    showActionSheet(
      {
        title,
        options: [t('schedule.onlyThisWeek'), t('schedule.everyWeek'), t('common.cancel')],
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) run('week');
        if (index === 1) run('every');
      },
    );
  }

  // Only in this week already (added to it, or a routine moved within it):
  // nothing to ask, it's changed there.
  function onlyThisWeek(activity: DayActivity): boolean {
    return activity.addedId !== undefined || (activity.kind === 'routine' && !!activity.from);
  }

  // A usual week's sport as this week's own, on `date`.
  function sportCopy(
    sport: WeeklySport,
    date: string,
    position: number,
    times: Pick<WeeklySport, 'startTime' | 'durationS'> = sport,
  ): Addition {
    return {
      id: randomUUID(),
      date,
      routineId: null,
      sport: sport.sport,
      customName: sport.customName,
      startTime: times.startTime,
      durationS: times.durationS,
      position,
    };
  }

  // How far past a day's own rows the screen may scroll while one is
  // dragged: up to the top of the screen, down to the end of the week.
  function dragReach(day: Weekday): [number, number] {
    const box = dayBoxes[day];
    if (!box) return [0, 0];
    return [week.y + box.y + touch.min, Math.max(week.height - box.y - box.height, 0)];
  }

  // "Treu-ho d'aquest dia".
  function remove(activity: DayActivity, day: Weekday) {
    const dayName = t(`weekdays.long.${day}`);
    const name = nameOf(activity);
    const key = dayOf(day).key;
    const offThisWeek = () => {
      const message = t('schedule.droppedThisWeek', { day: dayName, name });
      if (activity.addedId) {
        changeWeek(
          { ...plan, additions: withAdditionMoved(additions, activity.addedId, null, 0) },
          message,
        );
      } else if (activity.kind === 'routine') {
        changeWeek(withPlannedMove(plan, plannedRoutineOf(activity, key), null), message);
      } else {
        changeWeek({ ...plan, drops: [...drops, { sportId: activity.sport.id, date: key }] }, message);
      }
    };
    if (onlyThisWeek(activity)) {
      offThisWeek();
      return;
    }
    askScope(t('schedule.scopeRemove', { name }), (scope) =>
      scope === 'week' ? offThisWeek() : removeEveryWeek(activity, day),
    );
  }

  // Off the usual week, with "Desfés" to put it back.
  function removeEveryWeek(activity: DayActivity, day: Weekday) {
    const message = t('schedule.removed', { day: t(`weekdays.long.${day}`), name: nameOf(activity) });
    if (activity.kind === 'routine') {
      const entry = {
        routineId: activity.routine.id,
        weekday: day,
        position: activity.routine.dayPositions[day] ?? 0,
      };
      removeFromDay.mutate(entry);
      showToast({
        message,
        action: { label: t('common.undo'), onPress: () => addToDay.mutate(entry) },
      });
    } else {
      const sport = activity.sport;
      removeSport.mutate(sport);
      showToast({
        message,
        action: { label: t('common.undo'), onPress: () => addSport.mutate(sport) },
      });
    }
  }

  // To another day, at the end of it. A routine can't go to a day that
  // already has it.
  function move(activity: DayActivity, from: Weekday, to: Weekday) {
    if (from === to) return;
    const name = nameOf(activity);
    const toName = t(`weekdays.long.${to}`);
    const toKey = dayOf(to).key;
    const position = nextDatePosition(dayOf(to).activities, to);
    const message = t('schedule.moved', { day: toName, name });
    const thereThisWeek =
      activity.kind === 'routine' &&
      dayOf(to).activities.some(
        (other) => other.kind === 'routine' && other.routine.id === activity.routine.id,
      );
    // Already there that week: nothing to ask.
    if (thereThisWeek) {
      showToast({ message: t('schedule.alreadyOn', { day: toName, name }) });
      return;
    }
    const moveThisWeek = () => {
      if (activity.addedId) {
        changeWeek(
          { ...plan, additions: withAdditionMoved(additions, activity.addedId, toKey, position) },
          message,
        );
      } else if (activity.kind === 'routine') {
        changeWeek(
          withPlannedMove(plan, plannedRoutineOf(activity, dayOf(from).key), toKey, position),
          message,
        );
      } else {
        // Off its day, and a copy on the new one.
        changeWeek(
          {
            ...plan,
            drops: [...drops, { sportId: activity.sport.id, date: dayOf(from).key }],
            additions: [...additions, sportCopy(activity.sport, toKey, position)],
          },
          message,
        );
      }
    };
    if (onlyThisWeek(activity)) {
      moveThisWeek();
      return;
    }
    askScope(t('schedule.scopeMove', { name, day: toName, dayLower: toName.toLocaleLowerCase() }), (scope) =>
      scope === 'week' ? moveThisWeek() : moveEveryWeek(activity, from, to),
    );
  }

  // In the usual week, with "Desfés" back to where it was.
  function moveEveryWeek(activity: DayActivity, from: Weekday, to: Weekday) {
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
          onPress: () => moveSport.mutate({ id: sport.id, weekday: from, position: sport.position }),
        },
      });
    }
  }

  // "Mou a un altre dia…": the days it isn't on yet.
  function moveMenu(activity: DayActivity, from: Weekday) {
    const targets = WEEKDAYS.filter(
      (day) =>
        day !== from &&
        (activity.kind !== 'routine' ||
          !dayOf(day).activities.some(
            (other) => other.kind === 'routine' && other.routine.id === activity.routine.id,
          )),
    );
    showActionSheet(
      {
        title: t('schedule.moveTitle', { name: nameOf(activity) }),
        options: [...targets.map((day) => t(`weekdays.long.${day}`)), t('common.cancel')],
        cancelButtonIndex: targets.length,
      },
      (index) => {
        const to = targets[index];
        if (to) move(activity, from, to);
      },
    );
  }

  // A sport's new time and duration: this week's own changes there; the
  // usual week's asks.
  function changeTime(sport: WeeklySport) {
    const name = nameOf({ kind: 'sport', sport });
    const message = t('schedule.timeChanged', { name });
    if (additions.some((addition) => addition.id === sport.id)) {
      changeWeek(
        {
          ...plan,
          additions: additions.map((addition) =>
            addition.id === sport.id
              ? { ...addition, startTime: sport.startTime, durationS: sport.durationS }
              : addition,
          ),
        },
        message,
      );
      return;
    }
    const key = dayOf(sport.weekday).key;
    askScope(t('schedule.scopeTime', { name }), (scope) => {
      if (scope === 'every') {
        updateSport.mutate({
          id: sport.id,
          change: { startTime: sport.startTime, durationS: sport.durationS },
        });
        return;
      }
      // Off that day, and a copy at the new time.
      changeWeek(
        {
          ...plan,
          drops: [...drops, { sportId: sport.id, date: key }],
          additions: [...additions, sportCopy(sport, key, sport.position, sport)],
        },
        message,
      );
    });
  }

  // "+ Afegeix" for this week only: on that date, after what's there.
  function addThisWeek(
    day: Weekday,
    thing: Pick<Addition, 'routineId' | 'sport' | 'customName' | 'startTime' | 'durationS'>,
    name: string,
  ) {
    const addition: Addition = {
      id: randomUUID(),
      date: dayOf(day).key,
      position: nextDatePosition(dayOf(day).activities, day),
      ...thing,
    };
    changeWeek(
      { ...plan, additions: [...additions, addition] },
      t('schedule.addedThisWeek', { day: t(`weekdays.long.${day}`), name }),
    );
  }

  // "Desfés els canvis": the week as it started, the usual one.
  function undoChanges() {
    changeWeek(
      {
        moves: moves.filter((move) => move.plannedDate < from || move.plannedDate > to),
        additions: [],
        drops: [],
      },
      t('schedule.changesUndone'),
    );
  }

  // Tap an activity: open the routine or change the sport's time, move it
  // to another day, or take it off the day (with "Desfés", so it isn't
  // shown as destructive).
  function openMenu(activity: DayActivity, day: Weekday) {
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
      <View style={styles.titleRow}>
        <IconButton
          icon="chevron.left"
          label={t('schedule.previousWeek')}
          onPress={() => setOffset(offset - 1)}
          disabled={offset === 0}
        />
        <View style={styles.title}>
          <Text variant="label" color="textMuted" accessibilityRole="header" style={styles.centered}>
            {weekTitle}
          </Text>
          <Text variant="bodyStrong" style={styles.centered}>
            {range}
          </Text>
          <Text variant="caption" color="textMuted" style={styles.centered}>
            {summary}
          </Text>
        </View>
        <IconButton
          icon="chevron.right"
          label={t('schedule.followingWeek')}
          onPress={() => setOffset(offset + 1)}
          disabled={offset === WEEKS_AHEAD}
        />
      </View>

      {changed ? (
        <Button
          label={t('schedule.undoChanges')}
          icon="arrow.uturn.backward"
          variant="ghost"
          onPress={undoChanges}
          style={styles.undo}
        />
      ) : null}

      <WeekStrip
        days={stripDays}
        canDrag={() => true}
        onDayPress={(day) => onScrollTo?.(week.y + (dayBoxes[day]?.y ?? 0))}
        onMove={move}
        onDragChange={onDragChange}
      />

      {/* The week at a glance above, day by day below. */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {t('schedule.dayByDay')}
      </Text>
      <Sortable.MultiZoneProvider>
        {days.map(({ day, date, activities, isToday }) => {
          const dayName = `${t(`weekdays.long.${day}`)} ${date.getDate()}`;
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
                  move(dragged.activity, dragged.day, day);
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
                      <Icon name="moon" size={14} weight="light" tintColor={colors.textMuted} />
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
                        draggable
                        onPress={() => openMenu(item, day)}
                      />
                    )}
                    onDragEnd={({ fromIndex, toIndex }) => {
                      if (fromIndex === toIndex) return;
                      const order = [...activities];
                      const [moved] = order.splice(fromIndex, 1);
                      order.splice(toIndex, 0, moved);
                      // The order within a day is the usual week's, so
                      // only its own activities are put in order.
                      reorderDay.mutate({
                        day,
                        order: order.filter((activity) => !onlyThisWeek(activity)),
                      });
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
        // Not the ones on that day this week.
        routines={routines.filter(
          (routine) =>
            !dayOf(sheetDay).activities.some(
              (other) => other.kind === 'routine' && other.routine.id === routine.id,
            ),
        )}
        anyRoutines={routines.length > 0}
        onClose={() => setSheet((current) => ({ ...current, visible: false }))}
        onCreateRoutine={(day, scope) => {
          setSheet((current) => ({ ...current, visible: false }));
          // Every week: planned on that weekday once made. This week only:
          // made first, then added.
          router.push(
            scope === 'every'
              ? { pathname: '/plan/routines/new', params: { weekday: String(day) } }
              : '/plan/routines/new',
          );
        }}
        onAddRoutine={(routine, day, scope) => {
          if (scope === 'week') {
            addThisWeek(
              day,
              {
                routineId: routine.id,
                sport: null,
                customName: null,
                startTime: null,
                durationS: null,
              },
              routine.name,
            );
            return;
          }
          if (routine.weekdays.includes(day)) {
            showToast({
              message: t('schedule.alreadyOn', { day: t(`weekdays.long.${day}`), name: routine.name }),
            });
            return;
          }
          addToDay.mutate({
            routineId: routine.id,
            weekday: day,
            position: nextDayPosition(routines, sports, day),
          });
        }}
        onSaveSport={(sport, scope) => {
          if (sheet.mode.kind === 'edit') {
            changeTime(sport);
          } else if (scope === 'week') {
            addThisWeek(
              sport.weekday,
              {
                routineId: null,
                sport: sport.sport,
                customName: sport.customName,
                startTime: sport.startTime,
                durationS: sport.durationS,
              },
              nameOf({ kind: 'sport', sport }),
            );
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
          <Icon
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
            <Icon
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    gap: 2,
  },
  centered: {
    textAlign: 'center',
  },
  // "Desfés els canvis", under the week's title.
  undo: {
    alignSelf: 'center',
  },
  // Around the card a dragged row would land on; it takes no room, so
  // nothing below it moves.
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
