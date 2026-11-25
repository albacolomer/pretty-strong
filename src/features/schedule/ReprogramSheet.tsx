import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sortable from 'react-native-sortables';

import { Button, MenuHost, Text, useActionSheet, Icon, type IconName, PageSheet } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { dropInWeek, moveInWeek, type WeekListItem } from './moves';

// A day from today to Sunday: "Avui", "Demà", "Dijous"…, and its sports as
// "Pàdel 19:00" (they stay where they are).
export type ReprogramDay = { date: string; title: string; sports: string[] };

// A routine still to do this week, on the day it's on now.
export type ReprogramRoutine = { key: string; date: string; name: string; icon: IconName };

type ReprogramSheetProps = {
  visible: boolean;
  days: ReprogramDay[];
  routines: ReprogramRoutine[];
  onClose: () => void;
  // Where each routine ended up.
  onSave: (placed: { key: string; date: string }[]) => void;
};

// "Reprograma la setmana…" (US-29): the days left this week as headings,
// each with its routines under it; drag a routine by its ≡ under another
// day, or use its ⋯ → "Mou a…". Nothing changes until "Desa".
export function ReprogramSheet({ visible, ...props }: ReprogramSheetProps) {
  const { colors } = useTheme();

  return (
    <PageSheet
      visible={visible}
      onRequestClose={props.onClose}>
      {/* A modal sits outside the app's root view, so dragging needs its own gesture root. */}
      <GestureHandlerRootView style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Only mounted while open, so it starts from the week as it is each time. */}
        {visible ? <SheetContent {...props} /> : null}
        {/* Menus opened while this sheet is up appear on it. */}
        <MenuHost />
      </GestureHandlerRootView>
    </PageSheet>
  );
}

function SheetContent({ days, routines, onClose, onSave }: Omit<ReprogramSheetProps, 'visible'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<WeekListItem[]>(() =>
    days.flatMap((day) => [
      { kind: 'day' as const, key: `day:${day.date}`, date: day.date },
      ...routines
        .filter((routine) => routine.date === day.date)
        .map((routine) => ({ kind: 'routine' as const, key: routine.key, date: routine.date })),
    ]),
  );
  // Lets the list scroll by itself while a routine is dragged to an edge.
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  // ⋯ → the other days, to put it at the end of one.
  function moveMenu(item: WeekListItem, name: string) {
    const others = days.filter((day) => day.date !== item.date);
    showActionSheet(
      {
        title: t('today.moveRoutineTo', { name }),
        options: [...others.map((day) => day.title), t('common.cancel')],
        cancelButtonIndex: others.length,
      },
      (index) => {
        const day = others[index];
        if (day) setList((current) => moveInWeek(current, item.key, day.date));
      },
    );
  }

  return (
    <>
      <View style={styles.header}>
        <View style={[styles.grabber, { backgroundColor: colors.control }]} />
        <Text variant="cardTitle" accessibilityRole="header">
          {t('today.reprogramTitle')}
        </Text>
        <Text variant="caption" color="textMuted" style={styles.centred}>
          {t('today.reprogramHint')}
        </Text>
      </View>

      <Animated.ScrollView ref={scrollableRef} contentContainerStyle={styles.content}>
        <Sortable.Grid
          data={list}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            if (item.kind === 'day') {
              const day = days.find((other) => other.date === item.date);
              const free =
                (day?.sports.length ?? 0) === 0 &&
                !list.some((other) => other.kind === 'routine' && other.date === item.date);
              return (
                <View style={styles.day}>
                  <Text variant="label" color="textMuted" accessibilityRole="header">
                    {day?.title}
                  </Text>
                  {day && day.sports.length > 0 ? (
                    <Text variant="caption" color="textMuted">
                      {day.sports.join(' · ')}
                    </Text>
                  ) : free ? (
                    <Text variant="caption" color="textMuted">
                      {t('today.rest')}
                    </Text>
                  ) : null}
                </View>
              );
            }
            const routine = routines.find((other) => other.key === item.key);
            const name = routine?.name ?? '';
            return (
              <View style={[styles.row, { backgroundColor: colors.surface }]}>
                <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                  {routine ? (
                    <Icon name={routine.icon} size={18} weight="light" tintColor={colors.accent} />
                  ) : null}
                </View>
                <Text variant="name" numberOfLines={1} style={styles.name}>
                  {name}
                </Text>
                <Pressable
                  role="button"
                  aria-label={t('today.moveRoutine', { name })}
                  onPress={() => moveMenu(item, name)}
                  style={({ pressed }) => [styles.handle, pressed && styles.pressed]}>
                  <Icon name="ellipsis" size={18} weight="light" tintColor={colors.textMuted} />
                </Pressable>
                <Sortable.Handle>
                  <View style={styles.handle} aria-label={t('today.reprogramHandle', { name })}>
                    <Icon
                      name="line.3.horizontal"
                      size={18}
                      weight="light"
                      tintColor={colors.textMuted}
                    />
                  </View>
                </Sortable.Handle>
              </View>
            );
          }}
          onDragEnd={({ fromIndex, toIndex }) =>
            setList((current) => dropInWeek(current, fromIndex, toIndex))
          }
          // Only the ≡ starts a drag, so scrolling the list never moves anything.
          customHandle
          scrollableRef={scrollableRef}
          rowGap={spacing.sm}
        />
      </Animated.ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.separator, paddingBottom: insets.bottom + spacing.sm },
        ]}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={onClose}
          style={styles.footerButton}
        />
        <Button
          label={t('schedule.save')}
          onPress={() =>
            onSave(
              list
                .filter((item) => item.kind === 'routine')
                .map(({ key, date }) => ({ key, date })),
            )
          }
          style={styles.footerButton}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
  },
  centred: {
    textAlign: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  // Tall enough to drop a routine under, even with nothing on it.
  day: {
    minHeight: touch.min,
    justifyContent: 'flex-end',
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min + spacing.md,
    paddingLeft: spacing.md,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
  },
  handle: {
    width: touch.min,
    height: touch.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
