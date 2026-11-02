import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sortable from 'react-native-sortables';

import { Button, MenuHost, Text } from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { useAppLanguage, type Language } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

type ReorderExercisesSheetProps<T extends { groupKey: string | null }> = {
  visible: boolean;
  // In their current order: a routine's exercises, or a workout's.
  items: T[];
  keyOf: (item: T) => string;
  exerciseOf: (item: T) => Exercise | undefined;
  // A row's name instead of the exercise's, e.g. "Sèries · 6 × 400 m".
  labelFor?: (item: T) => string;
  // What a drag does (see moveWithinGroups): the new order, with groups
  // updated.
  drop: (items: readonly T[], fromIndex: number, toIndex: number) => T[];
  onClose: () => void;
  onDone: (items: T[]) => void;
};

// A sheet listing exercises as short rows, to drag them into a new order by
// their ≡ handle. Short rows because the editor's and workout's cards are
// too tall to drag through. Dropping an exercise inside a superset adds it;
// dragging it out takes it out.
export function ReorderExercisesSheet<T extends { groupKey: string | null }>({
  visible,
  ...props
}: ReorderExercisesSheetProps<T>) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={props.onClose}>
      {/* A modal sits outside the app's root view, so dragging needs its own gesture root. */}
      <GestureHandlerRootView style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Only mounted while open, so it starts from the routine's order each time. */}
        {visible ? <SheetContent {...props} /> : null}
        {/* Menus opened while this sheet is up appear on it. */}
        <MenuHost />
      </GestureHandlerRootView>
    </Modal>
  );
}

function SheetContent<T extends { groupKey: string | null }>({
  items,
  keyOf,
  exerciseOf,
  labelFor,
  drop,
  onClose,
  onDone,
}: Omit<ReorderExercisesSheetProps<T>, 'visible'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const [order, setOrder] = useState(items);
  // Lets the list scroll by itself while an exercise is dragged to an edge.
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  return (
    <>
      <View style={styles.header}>
        <View style={[styles.grabber, { backgroundColor: colors.control }]} />
        <Text variant="cardTitle" accessibilityRole="header">
          {t('routines.reorder.title')}
        </Text>
        <Text variant="caption" color="textMuted">
          {t('routines.reorder.hint')}
        </Text>
      </View>

      <Animated.ScrollView ref={scrollableRef} contentContainerStyle={styles.content}>
        <Sortable.Grid
          data={order}
          keyExtractor={keyOf}
          renderItem={({ item }) => (
            <ReorderRow
              exercise={exerciseOf(item)}
              label={labelFor?.(item)}
              grouped={item.groupKey !== null}
              language={language}
            />
          )}
          onDragEnd={({ fromIndex, toIndex }) =>
            setOrder((current) => drop(current, fromIndex, toIndex))
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
          label={t('common.done')}
          onPress={() => onDone(order)}
          style={styles.footerButton}
        />
      </View>
    </>
  );
}

type ReorderRowProps = {
  exercise: Exercise | undefined;
  label: string | undefined;
  // In a superset or circuit: a pink bar, like the editor's bracket.
  grouped: boolean;
  language: Language;
};

function ReorderRow({ exercise, label, grouped, language }: ReorderRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = label ?? (exercise ? exerciseName(exercise, language) : '…');

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: colors.surface,
          borderLeftColor: grouped ? colors.accent : colors.surface,
        },
      ]}>
      {exercise ? <ExercisePicture exercise={exercise} size={40} /> : null}
      <Text variant="bodyStrong" style={styles.name} numberOfLines={2}>
        {name}
      </Text>
      <Sortable.Handle>
        <View aria-label={t('routines.reorder.handle', { name })} style={styles.handle}>
          <DragIcon />
        </View>
      </Sortable.Handle>
    </View>
  );
}

// Three short lines: "grab here".
function DragIcon() {
  const { colors } = useTheme();
  return (
    <View aria-hidden style={styles.dragIcon}>
      {[0, 1, 2].map((line) => (
        <View key={line} style={[styles.dragLine, { backgroundColor: colors.textMuted }]} />
      ))}
    </View>
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
  content: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min + spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 4,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  name: {
    flex: 1,
  },
  handle: {
    width: touch.check,
    height: touch.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIcon: {
    gap: 4,
  },
  dragLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
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
});
