import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { GradientView, Text } from '@/components/ui';
import { inset, metalTextShadows, radius, spacing, touch, useTheme } from '@/theme';

// How tall the steel panel is, below the status bar, and how far the
// sheet comes up over it.
const HERO_HEIGHT = 340;
const SHEET_OVERLAP = 32;

// Sign-in and sign-up (US-01): a steel panel with the app's name and a
// line under it, then a sheet with the title, the form and, last, the
// link to the other screen. The language pill sits over the panel, from
// the auth layout.
export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  // The form: its fields, then its main button at the bottom.
  children: ReactNode;
  // Under the form: "Ja tens compte? Entra".
  footer: ReactNode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* White status bar text on the steel. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        // Scrolls the focused field above the keyboard, and drag down to
        // hide it.
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bounces={false}>
        <View style={[styles.hero, { height: insets.top + HERO_HEIGHT }]}>
          <GradientView gradient="hero" style={StyleSheet.absoluteFill} />
          <Rings />
          <View style={styles.brand}>
            <Text
              variant="brand"
              color="onHero"
              accessibilityRole="header"
              style={metalTextShadows.large}>
              {t('app.name').split(' ').join('\n')}
            </Text>
            <Text color="onHeroSoft">{t('auth.tagline')}</Text>
          </View>
        </View>

        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg },
          ]}>
          <View style={styles.heading}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            <Text color="textMuted">{subtitle}</Text>
          </View>
          {children}
          {footer}
        </View>
      </ScrollView>
    </View>
  );
}

// The link under the form to the other screen: "Ja tens compte? Entra",
// the answer in bold. The whole line is the button.
export function AuthSwitch({
  question,
  action,
  onPress,
}: {
  question: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      aria-label={`${question} ${action}`}
      onPress={onPress}
      style={({ pressed }) => [styles.switch, pressed && styles.pressed]}>
      <Text color="textMuted" style={styles.switchText}>
        {question}{' '}
        <Text variant="bodyStrong" color="text">
          {action}
        </Text>
      </Text>
    </Pressable>
  );
}

// Thin dashed rings, off to the right of the panel, like the GO ring's.
function Rings() {
  const { colors } = useTheme();

  return (
    <Svg style={styles.rings} width={420} height={420} viewBox="0 0 420 420" aria-hidden>
      {[
        { r: 200, dash: '220 26' },
        { r: 150, dash: '160 22' },
        { r: 100, dash: '110 18' },
      ].map(({ r, dash }) => (
        <Circle
          key={r}
          cx={210}
          cy={210}
          r={r}
          fill="none"
          stroke={colors.heroRing}
          strokeWidth={2}
          strokeDasharray={dash}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
    paddingHorizontal: inset.screenX + spacing.sm,
    paddingBottom: SHEET_OVERLAP + spacing.xl,
  },
  rings: {
    position: 'absolute',
    right: -150,
    top: 10,
  },
  brand: {
    gap: spacing.sm,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: radius.card + spacing.md,
    borderTopRightRadius: radius.card + spacing.md,
    borderCurve: 'continuous',
    paddingHorizontal: inset.screenX + spacing.sm,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
  },
  heading: {
    gap: spacing.xs,
  },
  switch: {
    minHeight: touch.min,
    justifyContent: 'center',
  },
  switchText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
