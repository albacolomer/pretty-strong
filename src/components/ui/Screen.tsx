import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { inset, spacing, useTheme } from '@/theme';

import { GradientText } from './GradientText';

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
// scrolls it back to the top. The content fills at least the screen, so a
// child with flex: 1 can take up the space that's left.
export function Screen({ title, action, centered = false, children }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        centered
          ? [
              styles.centered,
              { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
            ]
          : // The status bar's height is added by iOS already: only the rest
            // of the design's top inset.
            { paddingTop: Math.max(inset.screenTop - insets.top, 0) },
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
          <View style={styles.title}>
            <GradientText
              variant="screenTitle"
              accessibilityRole="header"
              style={styles.titleText}
              containerStyle={styles.titleBox}>
              {title}
            </GradientText>
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: inset.screenX,
    paddingBottom: inset.screenBottom,
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  // The gradient fits the word, as in the design.
  titleBox: {
    alignSelf: 'flex-start',
  },
  // Italic capitals lean past their box; without this the last one's tip
  // would fall outside the gradient.
  titleText: {
    paddingRight: 4,
  },
  centered: {
    justifyContent: 'center',
  },
});
