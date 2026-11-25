import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { radius, spacing, useTheme } from '@/theme';

import type { PageSheetProps } from './PageSheet';

export type { PageSheetProps } from './PageSheet';

// The web's page sheet, drawn like iOS's (PageSheet.tsx): the screen dims
// and a card with rounded top corners slides up, leaving a strip of the
// screen above it. Closes with the sheet's own buttons.
export function PageSheet({ visible, onRequestClose, onDismiss, children }: PageSheetProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose}
      onDismiss={onDismiss}>
      <View style={styles.frame}>
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        />
        <Animated.View
          entering={SlideInDown.duration(300)}
          style={[styles.card, { backgroundColor: colors.background }]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  card: {
    flex: 1,
    marginTop: spacing.md,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    overflow: 'hidden',
  },
});
