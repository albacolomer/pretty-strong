import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { type AnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { inset, spacing, useTheme } from '@/theme';

import { ScreenTitle } from './ScreenTitle';

export type ScreenProps = {
  title?: string;
  // Next to the title, e.g. a settings button.
  action?: ReactNode;
  // Centres the content vertically, e.g. for the sign-in screen.
  centered?: boolean;
  // False keeps it from scrolling, e.g. while something is dragged sideways.
  scrollEnabled?: boolean;
  children?: ReactNode;
  // The ScrollView, e.g. to scroll down to a day in Plan → Setmana, or to
  // scroll by itself while something is dragged to its edge.
  ref?: AnimatedRef<Animated.ScrollView>;
};

// The ScrollView (Reanimated's, so a drag can scroll it) is the screen's
// root view on purpose: iOS then adds the
// status bar and tab bar insets for us, and tapping the current tab
// scrolls it back to the top. (Those insets come on top of the content's
// height, so content that grows to fill the screen would scroll by them:
// only centred screens, which add the insets themselves, grow.)
export function Screen({
  title,
  action,
  centered = false,
  scrollEnabled = true,
  children,
  ref,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Animated.ScrollView
      ref={ref}
      scrollEnabled={scrollEnabled}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        centered
          ? [
              styles.centered,
              { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
            ]
          : // The status bar's height is added by iOS already: only the rest
            // of the design's top inset. A browser adds nothing: under the
            // status bar (a Home Screen app) the web gives the whole inset;
            // in Safari the page already starts below it, so only a gap.
            {
              paddingTop:
                Platform.OS !== 'web'
                  ? Math.max(inset.screenTop - insets.top, 0)
                  : insets.top > 0
                    ? Math.max(inset.screenTop, insets.top)
                    : spacing.lg + spacing.xs,
            },
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
            <ScreenTitle title={title} />
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
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
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
