import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sortable from 'react-native-sortables';

import { Button, Text } from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { useAppLanguage, type Language } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

export type ReorderItem = {
  key: string;
  exercise: Exercise | undefined;
};

type ReorderExercisesSheetProps = {
  visible: boolean;
  // In the routine's current order.
  items: ReorderItem[];
  onClose: () => void;
  // The keys in their new order.
  onDone: (keys: string[]) => void;
};

// A sheet listing the routine's exercises as short rows, to drag them into a
// new order by their ≡ handle. Short rows because the editor's cards are
// too tall to drag through a long form.
export function ReorderExercisesSheet({ visible, ...props }: ReorderExercisesSheetProps) {
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
      </GestureHandlerRootView>
    </Modal>
  );
}

function SheetContent({ items, onClose, onDone }: Omit<ReorderExercisesSheetProps, 'visible'>) {
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
        <View style={[styles.grabber, { backgroundColor: colors.surfaceRaised }]} />
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
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => <ReorderRow item={item} language={language} />}
          onDragEnd={({ data }) => setOrder(data)}
          // Only the ≡ starts a drag, so scrolling the list never moves anything.
          customHandle
          scrollableRef={scrollableRef}
          rowGap={spacing.sm}
        />
      </Animated.ScrollView>

      <View
        style={[
          styles.footer,
          { borderTopColor: colors.surfaceRaised, paddingBottom: insets.bottom + spacing.sm },
        ]}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={onClose}
          style={styles.footerButton}
        />
        <Button
          label={t('common.done')}
          onPress={() => onDone(order.map((item) => item.key))}
          style={styles.footerButton}
        />
      </View>
    </>
  );
}

function ReorderRow({ item, language }: { item: ReorderItem; language: Language }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = item.exercise ? exerciseName(item.exercise, language) : '…';

  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      {item.exercise ? <ExercisePicture exercise={item.exercise} size={40} /> : null}
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
