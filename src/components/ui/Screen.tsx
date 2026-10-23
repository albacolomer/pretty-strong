import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '@/theme';

import { Text } from './Text';

export type ScreenProps = {
  title?: string;
  // Next to the title, e.g. a settings button.
  action?: ReactNode;
  // Centres the content vertically, e.g. for the sign-in screen.
  centered?: boolean;
  children?: ReactNode;
};

// The ScrollView is the screen's root view on purpose: iOS then adds the
// status bar and tab bar insets for us, and tapping the current tab
// scrolls it back to the top.
export function Screen({ title, action, centered = false, children }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        centered && [
          styles.centered,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ],
      ]}
      // Centred screens add the safe-area space themselves (above), so iOS
      // must not add it again or the content would sit too low.
      contentInsetAdjustmentBehavior={centered ? 'never' : 'automatic'}
      // Scrolls the focused input above the keyboard, lets a button be
      // tapped while the keyboard is open, and drag down to hide it.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive">
      {title ? (
        <View style={styles.titleRow}>
          <Text variant="title" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {action}
        </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
