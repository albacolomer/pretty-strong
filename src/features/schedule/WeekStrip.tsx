import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';
import { radius, spacing, useTheme } from '@/theme';

import type { WeeklySport } from './sports';
import { useActivityName } from './useActivityName';
import { activitiesOnDay } from './week';

// Lines a day shows before "+2".
const MAX_LINES = 3;
const LINE_HEIGHT = 18;
// Room for MAX_LINES lines and "+2", so every day is as tall.
const DAY_MIN_HEIGHT = (MAX_LINES + 1) * (LINE_HEIGHT + 3) + 28;

// Over Plan → Setmana's list: the usual week at a glance, Monday to Sunday,
// like a week row of Google Calendar's month view. Each day has one line
// per activity (a routine tinted blue, a sport grey), a moon on a rest day,
// and today stands out. Only to look at: a tap on a day goes down to it in
// the list, where things are added and changed.
export function WeekStrip({
  routines,
  sports,
  today,
  onDayPress,
}: {
  routines: readonly Routine[];
  sports: readonly WeeklySport[];
  today: Weekday;
  onDayPress: (day: Weekday) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const nameOf = useActivityName();

  return (
    <Card style={styles.strip}>
      {WEEKDAYS.map((day, index) => {
        const activities = activitiesOnDay(routines, sports, day);
        const isToday = day === today;
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
              activities.slice(0, MAX_LINES).map((activity, line) => {
                const routine = activity.kind === 'routine';
                return (
                  <View
                    key={activity.key}
                    aria-hidden
                    style={[
                      styles.line,
                      {
                        backgroundColor: routine ? colors.accentSoft : colors.surfaceRaised,
                        borderLeftColor: routine ? colors.accent : colors.control,
                      },
                    ]}>
                    <Text
                      variant="badge"
                      color={routine ? 'accent' : 'textSecondary'}
                      numberOfLines={1}
                      ellipsizeMode="clip">
                      {names[line]}
                    </Text>
                  </View>
                );
              })
            )}
            {hidden > 0 ? (
              <Text variant="badge" color="textMuted" style={styles.more} aria-hidden>
                +{hidden}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </Card>
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
  more: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
