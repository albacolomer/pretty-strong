import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { inset, radius, spacing, touch, useTheme } from '@/theme';

import { Text } from './Text';

// What a menu shows, as iOS's action sheet takes it: the options in order,
// one of them "Cancel·la", maybe one destructive (red).
export type MenuOptions = {
  title?: string;
  message?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number;
};

type OpenMenu = { options: MenuOptions; onPick: (index: number) => void };

// iOS shows each sheet, and the workout screen, on its own layer above the
// app, so a menu drawn on a lower one would be hidden. Each layer has a
// MenuHost; they're kept in the order they appeared, and a menu opens in
// the last one, the top-most.
const hosts: ((menu: OpenMenu) => void)[] = [];

// Opens a menu in the top-most host; `onPick` gets the option's index
// (Cancel·la's when it's dismissed). An object, so tests can stand in for
// it: jest.spyOn(menus, 'show').
export const menus = {
  show(options: MenuOptions, onPick: (index: number) => void) {
    hosts.at(-1)?.({ options, onPick });
  },
};

const PANEL_MAX_HEIGHT = 0.6;

// Where menus appear on one layer: over everything on it, a dimmed screen
// and a panel from the bottom, with each option a white pill and
// Cancel·la a blue one, last, within thumb reach. Put it last on the layer.
export function MenuHost() {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [menu, setMenu] = useState<OpenMenu | null>(null);

  useEffect(() => {
    const open = (next: OpenMenu) => setMenu(next);
    hosts.push(open);
    return () => {
      hosts.splice(hosts.indexOf(open), 1);
    };
  }, []);

  if (!menu) return null;
  const { title, message, options, cancelButtonIndex, destructiveButtonIndex } = menu.options;

  function pick(index: number) {
    if (!menu) return;
    setMenu(null);
    menu.onPick(index);
  }

  function cancel() {
    if (cancelButtonIndex === undefined) setMenu(null);
    else pick(cancelButtonIndex);
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      // VoiceOver stays in the menu; its escape gesture cancels.
      accessibilityViewIsModal
      onAccessibilityEscape={cancel}>
      <Animated.View
        entering={FadeIn.duration(150)}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}>
        <Pressable accessible={false} onPress={cancel} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(220)}
        style={[
          styles.panel,
          { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.sm },
        ]}>
        {title || message ? (
          <View style={styles.heading}>
            {title ? (
              <Text
                variant="captionMedium"
                color="textMuted"
                accessibilityRole="header"
                style={styles.centred}>
                {title}
              </Text>
            ) : null}
            {message ? (
              <Text variant="caption" color="textMuted" style={styles.centred}>
                {message}
              </Text>
            ) : null}
          </View>
        ) : null}
        <ScrollView
          style={{ maxHeight: height * PANEL_MAX_HEIGHT }}
          contentContainerStyle={styles.options}
          // The shadows reach past the buttons.
          showsVerticalScrollIndicator={false}>
          {options.map((label, index) =>
            index === cancelButtonIndex ? null : (
              <Pressable
                key={label}
                role="button"
                onPress={() => pick(index)}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.surface, boxShadow: shadows.control },
                  pressed && styles.pressed,
                ]}>
                <Text
                  variant="bodyStrong"
                  color={index === destructiveButtonIndex ? 'danger' : 'accent'}
                  numberOfLines={2}
                  style={styles.centred}>
                  {label}
                </Text>
              </Pressable>
            ),
          )}
        </ScrollView>
        {cancelButtonIndex !== undefined ? (
          <Pressable
            role="button"
            onPress={cancel}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              pressed && styles.pressed,
            ]}>
            <Text variant="bodyStrong" color="onAccent">
              {options[cancelButtonIndex]}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: inset.screenX,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderCurve: 'continuous',
  },
  heading: {
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  options: {
    gap: spacing.sm,
    // Room for the shadows at the top and bottom.
    paddingVertical: spacing.xs,
  },
  button: {
    minHeight: touch.min + spacing.xs,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centred: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
