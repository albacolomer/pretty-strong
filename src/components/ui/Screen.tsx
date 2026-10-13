import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { spacing, useTheme } from '@/theme';

import { Text } from './Text';

export type ScreenProps = {
  title?: string;
  children?: ReactNode;
};

// The ScrollView is the screen's root view on purpose: iOS then adds the
// status bar and tab bar insets for us, and tapping the current tab
// scrolls it back to the top.
export function Screen({ title, children }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      // Scrolls the focused input above the keyboard, lets a button be
      // tapped while the keyboard is open, and drag down to hide it.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive">
      {title ? (
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
