import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type HostInstance } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { Card, Text } from '@/components/ui';
import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';
import { radius, spacing, useTheme } from '@/theme';

import type { WeeklySport } from './sports';
import { useActivityName } from './useActivityName';
import { activitiesOnDay, type DayActivity } from './week';

// Lines a day shows before "+2".
const MAX_LINES = 3;
const LINE_HEIGHT = 18;
// Room for MAX_LINES lines and "+2", so every day is as tall.
const DAY_MIN_HEIGHT = (MAX_LINES + 1) * (LINE_HEIGHT + 3) + 28;
// How long a line is held before it lifts to be dragged.
const LIFT_AFTER_MS = 300;

// A line being dragged: what, from which day, and where the finger is
// within the strip.
type Drag = { activity: DayActivity; from: Weekday; x: number; y: number };

type WeekStripProps = {
  routines: readonly Routine[];
  sports: readonly WeeklySport[];
  today: Weekday;
  onDayPress: (day: Weekday) => void;
  // A line dropped on another day.
  onMove: (activity: DayActivity, from: Weekday, to: Weekday) => void;
};

// Over Plan → Setmana's list: the usual week at a glance, Monday to Sunday,
// like a week row of Google Calendar's month view. Each day has one line
// per activity (a routine tinted blue, a sport grey), a moon on a rest day,
// and today stands out. A tap on a day goes down to it in the list. Hold a
// line and drag it to another day to move it there (also in the list's
// menu: "Mou a un altre dia…").
export function WeekStrip({ routines, sports, today, onDayPress, onMove }: WeekStripProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const nameOf = useActivityName();
  // Where the strip is on screen, for which day is under the finger.
  const strip = useRef<HostInstance>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dayWidth = width / WEEKDAYS.length;
  const over = drag ? dayAt(drag.x) : null;

  function measure() {
    strip.current?.measureInWindow((x, y, measured) => {
      origin.current = { x, y };
      setWidth(measured);
    });
  }

  function dayAt(x: number): Weekday | null {
    if (dayWidth === 0) return null;
    return WEEKDAYS[Math.floor(x / dayWidth)] ?? null;
  }

  return (
    <View ref={strip} onLayout={measure}>
    <Card style={styles.strip}>
      {WEEKDAYS.map((day, index) => {
        const activities = activitiesOnDay(routines, sports, day);
        const isToday = day === today;
        const hidden = activities.length - MAX_LINES;
        const names = activities.map(nameOf);
        const target = drag !== null && over === day && day !== drag.from;
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
              target && { backgroundColor: colors.accentSoft, borderColor: colors.accent },
              target && styles.target,
              pressed && styles.pressed,
            ]}>
            <Text
              variant="label"
              color={isToday ? 'accent' : 'textMuted'}
              style={styles.weekday}
              aria-hidden>
              {t(`weekdays.short.${day}`)}
            </Text>
            {activities.length === 0 ? (
              <View style={styles.rest} aria-hidden>
                <SymbolView name="moon" size={13} weight="light" tintColor={colors.control} />
              </View>
            ) : (
              activities
                .slice(0, MAX_LINES)
                .map((activity, line) => (
                  <DraggableLine
                    key={activity.key}
                    activity={activity}
                    name={names[line]}
                    lifted={drag?.activity.key === activity.key && drag.from === day}
                    onLift={(x, y) => {
                      measure();
                      void impactAsync(ImpactFeedbackStyle.Light);
                      setDrag({ activity, from: day, x: x - origin.current.x, y: y - origin.current.y });
                    }}
                    onDrag={(x, y) =>
                      setDrag((current) =>
                        current && { ...current, x: x - origin.current.x, y: y - origin.current.y },
                      )
                    }
                    onDrop={(x, canceled) => {
                      const to = dayAt(x - origin.current.x);
                      setDrag(null);
                      if (!canceled && to !== null && to !== day) onMove(activity, day, to);
                    }}
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
      {drag ? (
        <View
          pointerEvents="none"
          style={[
            styles.line,
            styles.ghost,
            lineColors(drag.activity, colors),
            {
              width: Math.max(dayWidth - 6, 40),
              left: drag.x - Math.max(dayWidth - 6, 40) / 2,
              top: drag.y - LINE_HEIGHT / 2,
              boxShadow: shadows.control,
            },
          ]}>
          <Text
            variant="badge"
            color={drag.activity.kind === 'routine' ? 'accent' : 'textSecondary'}
            numberOfLines={1}>
            {nameOf(drag.activity)}
          </Text>
        </View>
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

// One activity's line. Held for a moment, it lifts (a light tap) and
// follows the finger; let go over another day to move it there.
function DraggableLine({
  activity,
  name,
  lifted,
  onLift,
  onDrag,
  onDrop,
}: {
  activity: DayActivity;
  name: string;
  lifted: boolean;
  onLift: (x: number, y: number) => void;
  onDrag: (x: number, y: number) => void;
  onDrop: (x: number, canceled: boolean) => void;
}) {
  const { colors } = useTheme();
  const pan = usePanGesture({
    activateAfterLongPress: LIFT_AFTER_MS,
    // A few lines and a re-render per move: simple enough on the JS side.
    runOnJS: true,
    onActivate: (event) => onLift(event.absoluteX, event.absoluteY),
    onUpdate: (event) => onDrag(event.absoluteX, event.absoluteY),
    onDeactivate: (event) => onDrop(event.absoluteX, event.canceled),
  });

  return (
    <GestureDetector gesture={pan}>
      <View aria-hidden style={[styles.line, lineColors(activity, colors), lifted && styles.lifted]}>
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
  // The day a dragged line would land on.
  target: {
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
  lifted: {
    opacity: 0.3,
  },
  ghost: {
    position: 'absolute',
  },
  more: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
