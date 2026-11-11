import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type Animated from 'react-native-reanimated';
import type { AnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import { Card, Text, useActionSheet, useToast } from '@/components/ui';
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

import { ActivitySheet, type ActivitySheetMode } from './ActivitySheet';
import { weekdayOf } from './dates';
import { SPORT_ICONS, type WeeklySport } from './sports';
import { useActivityName } from './useActivityName';
import { useToday } from './useToday';
import { useAddToDay, useMoveToDay, useRemoveFromDay } from './useWeekSchedule';
import { WeekStrip } from './WeekStrip';
import {
  useAddSport,
  useMoveSport,
  useRemoveSport,
  useReorderDay,
  useUpdateSport,
  useWeeklySports,
} from './useWeeklySports';
import { activitiesOnDay, nextDayPosition, weekSummary, type DayActivity } from './week';

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
export function WeekSchedule({
  onScrollTo,
  scrollableRef,
}: {
  onScrollTo?: (y: number) => void;
  // The screen's ScrollView, which scrolls by itself while a row is
  // dragged to its edge.
  scrollableRef?: AnimatedRef<Animated.ScrollView>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const showToast = useToast();
  const nameOf = useActivityName();
  const today = weekdayOf(useToday());
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
  const [overDay, setOverDay] = useState<Weekday | null>(null);
  // The add/edit sheet: what it's for, whether it's showing, and a count
  // that gives each opening a fresh start.
  const [sheet, setSheet] = useState<{ mode: ActivitySheetMode; visible: boolean; opened: number }>(
    { mode: { kind: 'add', day: 1 }, visible: false, opened: 0 },
  );
  // Where the week and each day's card are, for a tap in the strip: the
  // week within the screen's scroll, each day within the week.
  const weekTop = useRef(0);
  const dayTops = useRef<Partial<Record<Weekday, number>>>({});

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;

  const summary = weekSummary(routines, sports);
  // Loaded by now; named again because TypeScript forgets that inside the
  // functions below.
  const planned = routines;
  const sheetDay = sheet.mode.kind === 'add' ? sheet.mode.day : sheet.mode.sport.weekday;

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

  // "Mou a un altre dia…": the days it isn't on yet.
  function moveMenu(activity: DayActivity, from: Weekday) {
    const days = WEEKDAYS.filter(
      (day) =>
        day !== from && (activity.kind !== 'routine' || !activity.routine.weekdays.includes(day)),
    );
    showActionSheet(
      {
        title: t('schedule.moveTitle', { name: nameOf(activity) }),
        options: [...days.map((day) => t(`weekdays.long.${day}`)), t('common.cancel')],
        cancelButtonIndex: days.length,
      },
      (index) => {
        const to = days[index];
        if (to) move(activity, from, to);
      },
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
        weekTop.current = event.nativeEvent.layout.y;
      }}>
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

      <WeekStrip
        routines={routines}
        sports={sports}
        today={today}
        onDayPress={(day) => onScrollTo?.(weekTop.current + (dayTops.current[day] ?? 0))}
        onMove={move}
      />

      {/* The week at a glance above, day by day below. */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {t('schedule.dayByDay')}
      </Text>

      <Sortable.MultiZoneProvider>

        {WEEKDAYS.map((day) => {
          const activities = activitiesOnDay(routines, sports, day);
          const dayName = t(`weekdays.long.${day}`);
          const rest = activities.length === 0;
          return (
            <Sortable.BaseZone
              key={day}
              onLayout={(event) => {
                dayTops.current[day] = event.nativeEvent.layout.y;
              }}
              // Not its own day: nothing would move.
              onItemEnter={() => {
                if (dragging.current?.day !== day) setOverDay(day);
              }}
              onItemLeave={() => setOverDay((current) => (current === day ? null : current))}
              onItemDrop={() => {
                setOverDay(null);
                const dragged = dragging.current;
                dragging.current = null;
                if (dragged && dragged.day !== day) move(dragged.activity, dragged.day, day);
              }}>
              <Card
                style={[
                  styles.day,
                  rest && [styles.restDay, { borderColor: colors.control }],
                  // The card a dragged row would land on.
                  overDay === day && [styles.dropTarget, { borderColor: colors.accent }],
                ]}>
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
                  {day === today ? (
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
                        day={day}
                        draggable={activities.length > 1}
                        onPress={() => openMenu(item, day)}
                      />
                    )}
                    onDragEnd={({ fromIndex, toIndex }) => {
                      if (fromIndex === toIndex) return;
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

// One planned activity: its icon (a routine's tinted, a sport's outlined),
// its name, and what it is: "Rutina · Esquena i bíceps · ~1 h 30 min" or
// "Esport · 19:00 · 1 h 30 min". The handle drags it within the day.
function ActivityRow({
  activity,
  day,
  draggable,
  onPress,
}: {
  activity: DayActivity;
  day: Weekday;
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
        aria-label={t('schedule.menuFor', { name, day: t(`weekdays.long.${day}`) })}
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
  dropTarget: {
    borderWidth: 1.5,
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
