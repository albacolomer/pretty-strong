import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text, useToast } from '@/components/ui';
import { WEEKDAYS, type Routine, type Weekday } from '@/features/routines/routine';
import { RoutineTypeTag } from '@/features/routines/RoutineTypeTag';
import { useRoutines } from '@/features/routines/useRoutines';
import { radius, spacing, touch, useTheme } from '@/theme';

import { weekdayOf } from './dates';
import { useToday } from './useToday';
import { useAddToDay, useRemoveFromDay } from './useWeekSchedule';
import { nextPosition, routinesOnDay } from './week';

function openRoutine(routine: Routine) {
  router.push({ pathname: '/plan/routines/[id]', params: { id: routine.id } });
}

// Plan → Setmana (US-09): Monday to Sunday, each day with its routines (or
// rest). The same days the routine editor's circles set.
export function WeekSchedule() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const showToast = useToast();
  const today = weekdayOf(useToday());
  const { data: routines, isPending, isError } = useRoutines();
  const addToDay = useAddToDay();
  const removeFromDay = useRemoveFromDay();

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('routines.loadError')}</Text>;
  if (routines.length === 0) {
    return (
      <Card>
        <Text color="textMuted">{t('schedule.noRoutines')}</Text>
      </Card>
    );
  }

  // The native list of the routines not on this day yet.
  function chooseRoutine(day: Weekday, available: Routine[]) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t(`weekdays.long.${day}`),
        message: t('schedule.pickRoutine'),
        options: [...available.map((routine) => routine.name), t('common.cancel')],
        cancelButtonIndex: available.length,
        userInterfaceStyle: scheme,
      },
      (index) => {
        const routine = available[index];
        if (routine) {
          addToDay.mutate({
            routineId: routine.id,
            weekday: day,
            position: nextPosition(routines ?? [], day),
          });
        }
      },
    );
  }

  // Taking it off a day can be undone, so it isn't shown as destructive.
  function openMenu(routine: Routine, day: Weekday) {
    const dayName = t(`weekdays.long.${day}`);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: routine.name,
        options: [t('schedule.open'), t('schedule.remove'), t('common.cancel')],
        cancelButtonIndex: 2,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === 0) openRoutine(routine);
        if (index !== 1) return;
        const entry = {
          routineId: routine.id,
          weekday: day,
          position: routine.dayPositions[day] ?? 0,
        };
        removeFromDay.mutate(entry);
        showToast({
          message: t('schedule.removed', { day: dayName, name: routine.name }),
          action: { label: t('common.undo'), onPress: () => addToDay.mutate(entry) },
        });
      },
    );
  }

  return (
    <View style={styles.week}>
      <Text variant="caption" color="textMuted">
        {t('schedule.hint')}
      </Text>
      {WEEKDAYS.map((day) => {
        const planned = routinesOnDay(routines, day);
        const available = routines.filter((routine) => !routine.weekdays.includes(day));
        const dayName = t(`weekdays.long.${day}`);
        return (
          <Card key={day}>
            <View style={styles.dayHeader}>
              <Text variant="bodyStrong" accessibilityRole="header">
                {dayName}
              </Text>
              {day === today ? (
                <View style={[styles.todayTag, { backgroundColor: colors.accent }]}>
                  <Text variant="caption" color="onAccent">
                    {t('schedule.today')}
                  </Text>
                </View>
              ) : null}
              <View style={styles.spacer} />
              {available.length > 0 ? (
                <Button
                  label={t('schedule.add')}
                  aria-label={t('schedule.addFor', { day: dayName })}
                  variant="ghost"
                  onPress={() => chooseRoutine(day, available)}
                  style={styles.add}
                />
              ) : null}
            </View>

            {planned.length === 0 ? (
              <Text color="textMuted">{t('schedule.rest')}</Text>
            ) : (
              planned.map((routine) => (
                <View key={routine.id} style={styles.routineRow}>
                  <Pressable
                    role="button"
                    onPress={() => openRoutine(routine)}
                    style={({ pressed }) => [styles.routine, pressed && styles.pressed]}>
                    <Text style={styles.name} numberOfLines={1}>
                      {routine.name}
                    </Text>
                    <RoutineTypeTag routine={routine} />
                  </Pressable>
                  <MenuButton
                    label={t('schedule.menuFor', { name: routine.name, day: dayName })}
                    onPress={() => openMenu(routine, day)}
                  />
                </View>
              ))
            )}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    gap: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
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
    paddingHorizontal: spacing.sm,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routine: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
  },
  name: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
