import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  measure,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Card, Text, Icon } from '@/components/ui';
import { WEEKDAYS, type Weekday } from '@/features/routines/routine';
import { radius, spacing, useTheme } from '@/theme';

import { useActivityName } from './useActivityName';
import type { DayActivity } from './week';

// Lines a day shows before "+2".
const MAX_LINES = 3;
const LINE_HEIGHT = 18;
// Room for MAX_LINES lines and "+2", so every day is as tall.
const DAY_MIN_HEIGHT = (MAX_LINES + 1) * (LINE_HEIGHT + 3) + 28;
// How long a line is held before it lifts to be dragged.
const LIFT_AFTER_MS = 300;
const DAYS = WEEKDAYS.length;
// No day under the finger.
const NONE = -1;

// One day of the strip: its title ("Dl", or "Dl 17" in a dated week) and
// what's on it.
export type StripDay = {
  day: Weekday;
  title: string;
  activities: DayActivity[];
  isToday: boolean;
};

type WeekStripProps = {
  // Monday to Sunday.
  days: StripDay[];
  // Whether a line can be dragged (in the week being planned, only
  // routines); all of them by default.
  canDrag?: (activity: DayActivity, day: Weekday) => boolean;
  onDayPress: (day: Weekday) => void;
  // A line dropped on another day.
  onMove: (activity: DayActivity, from: Weekday, to: Weekday) => void;
  // A line lifted (true) or let go (false): the screen keeps still meanwhile.
  onDragChange?: (dragging: boolean) => void;
};

// Over Plan → Setmana's list: the usual week at a glance, Monday to Sunday,
// like a week row of Google Calendar's month view. Each day has one line
// per activity (a routine tinted blue, a sport grey), a moon on a rest day,
// and today stands out. A tap on a day goes down to it in the list. Hold a
// line and drag it to another day to move it there (also in the list's
// menu: "Mou a un altre dia…").
//
// The dragged line follows the finger on the UI thread (Reanimated), and
// the day under it is marked the same way: nothing re-renders while it
// moves, only when it's lifted and let go.
export function WeekStrip({
  days,
  canDrag = () => true,
  onDayPress,
  onMove,
  onDragChange,
}: WeekStripProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const nameOf = useActivityName();
  const strip = useAnimatedRef<View>();
  const [width, setWidth] = useState(0);
  // What's lifted, for the line under the finger and its faded place.
  const [lifted, setLifted] = useState<{ activity: DayActivity; from: Weekday } | null>(null);
  // Where the finger is within the strip, and the day under it (an index).
  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);
  const over = useSharedValue(NONE);
  const ghostWidth = Math.max(width / DAYS - 6, 40);

  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: fingerX.get() - ghostWidth / 2 },
      { translateY: fingerY.get() - LINE_HEIGHT / 2 },
    ],
  }));

  function lift(activity: DayActivity, from: Weekday) {
    void impactAsync(ImpactFeedbackStyle.Light);
    setLifted({ activity, from });
    onDragChange?.(true);
  }

  function drop(activity: DayActivity, from: Weekday, index: number, canceled: boolean) {
    setLifted(null);
    onDragChange?.(false);
    const to = WEEKDAYS[index];
    if (!canceled && to !== undefined && to !== from) onMove(activity, from, to);
  }

  return (
    <View ref={strip} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Card style={styles.strip}>
        {days.map(({ day, title, activities, isToday }, index) => {
          const hidden = activities.length - MAX_LINES;
          const names = activities.map(nameOf);
          return (
            <Pressable
              key={day}
              role="button"
              aria-label={t('schedule.stripDay', {
                day: t(`weekdays.long.${day}`),
                plan: names.length > 0 ? names.join(', ') : t('schedule.restDay'),
              })}
              onPress={() => onDayPress(day)}
              style={({ pressed }) => [
                styles.day,
                index > 0 && {
                  borderLeftWidth: StyleSheet.hairlineWidth,
                  borderLeftColor: colors.separator,
                },
                isToday && { backgroundColor: colors.accentSoft },
                pressed && styles.pressed,
              ]}>
              <DropMark
                index={index}
                over={over}
                active={lifted !== null && lifted.from !== day}
              />
              <Text
                variant="label"
                color={isToday ? 'accent' : 'textMuted'}
                style={styles.weekday}
                aria-hidden>
                {title}
              </Text>
              {activities.length === 0 ? (
                <View style={styles.rest} aria-hidden>
                  <Icon name="moon" size={13} weight="light" tintColor={colors.control} />
                </View>
              ) : (
                activities.slice(0, MAX_LINES).map((activity, line) => (
                  <DraggableLine
                    key={activity.key}
                    activity={activity}
                    name={names[line]}
                    draggable={canDrag(activity, day)}
                    faded={lifted?.activity.key === activity.key && lifted.from === day}
                    strip={strip}
                    fingerX={fingerX}
                    fingerY={fingerY}
                    over={over}
                    onLift={() => lift(activity, day)}
                    onDrop={(target, canceled) => drop(activity, day, target, canceled)}
                  />
                ))
              )}
              {hidden > 0 ? (
                <Text variant="badge" color="textMuted" style={styles.more} aria-hidden>
                  +{hidden}
                </Text>
              ) : null}
            </Pressable>
          );
        })}

        {/* The line being dragged, under the finger. */}
        {lifted ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.line,
              styles.ghost,
              lineColors(lifted.activity, colors),
              { width: ghostWidth, boxShadow: shadows.control },
              ghostStyle,
            ]}>
            <Text
              variant="badge"
              color={lifted.activity.kind === 'routine' ? 'accent' : 'textSecondary'}
              numberOfLines={1}>
              {nameOf(lifted.activity)}
            </Text>
          </Animated.View>
        ) : null}
      </Card>
    </View>
  );
}

function lineColors(activity: DayActivity, colors: ReturnType<typeof useTheme>['colors']) {
  return activity.kind === 'routine'
    ? { backgroundColor: colors.accentSoft, borderLeftColor: colors.accent }
    : { backgroundColor: colors.surfaceRaised, borderLeftColor: colors.control };
}

// The ring on the day a dragged line would land on. `active`: a line is
// lifted and this isn't its own day.
function DropMark({
  index,
  active,
  over,
}: {
  index: number;
  active: boolean;
  over: SharedValue<number>;
}) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    opacity: active && over.get() === index ? 1 : 0,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.mark,
        { borderColor: colors.accent, backgroundColor: colors.accentSoft },
        style,
      ]}
    />
  );
}

// One activity's line. Held for a moment, it lifts (a light tap) and
// follows the finger; let go over another day to move it there.
function DraggableLine({
  activity,
  name,
  draggable,
  faded,
  strip,
  fingerX,
  fingerY,
  over,
  onLift,
  onDrop,
}: {
  activity: DayActivity;
  name: string;
  draggable: boolean;
  faded: boolean;
  strip: AnimatedRef<View>;
  fingerX: SharedValue<number>;
  fingerY: SharedValue<number>;
  over: SharedValue<number>;
  onLift: () => void;
  onDrop: (index: number, canceled: boolean) => void;
}) {
  const { colors } = useTheme();
  // Where the strip is now, measured when the line lifts: the screen may
  // have scrolled since it was laid out.
  const origin = useSharedValue({ x: 0, y: 0, width: 0 });

  const pan = usePanGesture({
    enabled: draggable,
    activateAfterLongPress: LIFT_AFTER_MS,
    onActivate: (event) => {
      'worklet';
      const box = measure(strip);
      if (!box || box.width === 0) return;
      origin.set({ x: box.pageX, y: box.pageY, width: box.width });
      fingerX.set(event.absoluteX - box.pageX);
      fingerY.set(event.absoluteY - box.pageY);
      over.set(Math.floor(((event.absoluteX - box.pageX) / box.width) * DAYS));
      scheduleOnRN(onLift);
    },
    onUpdate: (event) => {
      'worklet';
      const { x, y, width } = origin.get();
      if (width === 0) return;
      fingerX.set(event.absoluteX - x);
      fingerY.set(event.absoluteY - y);
      const index = Math.floor(((event.absoluteX - x) / width) * DAYS);
      over.set(index >= 0 && index < DAYS ? index : NONE);
    },
    onDeactivate: (event) => {
      'worklet';
      const index = over.get();
      over.set(NONE);
      scheduleOnRN(onDrop, index, event.canceled);
    },
  });

  return (
    <GestureDetector gesture={pan}>
      <View aria-hidden style={[styles.line, lineColors(activity, colors), faded && styles.faded]}>
        <Text
          variant="badge"
          color={activity.kind === 'routine' ? 'accent' : 'textSecondary'}
          numberOfLines={1}
          ellipsizeMode="clip">
          {name}
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
    overflow: 'hidden',
  },
  day: {
    flex: 1,
    minHeight: DAY_MIN_HEIGHT,
    paddingHorizontal: 3,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 3,
  },
  // Over the whole day; it takes no room, so nothing moves.
  mark: {
    position: 'absolute',
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderWidth: 1.5,
    borderRadius: radius.input,
  },
  weekday: {
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  rest: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  // A bar like a calendar's event: the name, cut to fit, after a coloured edge.
  line: {
    height: LINE_HEIGHT,
    justifyContent: 'center',
    paddingLeft: 3,
    paddingRight: 1,
    borderLeftWidth: 2,
    borderRadius: radius.small,
    overflow: 'hidden',
  },
  // Its place while it's being dragged.
  faded: {
    opacity: 0.3,
  },
  ghost: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  more: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
