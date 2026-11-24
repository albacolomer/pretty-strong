import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, GradientText, GradientView, HeaderBackButton, Text } from '@/components/ui';
import { inset, radius, spacing, useTheme } from '@/theme';

const BAR_HEIGHT = 6;
// The back button's width, kept free when there is none so the bar
// doesn't jump.
const BACK_SIZE = 36;

// The top of every question: ‹ back and how far along you are. It stays
// while the steps change under it, so the bar slides from one to the next.
export function SetupHeader({
  progress,
  onBack,
}: {
  // 0 to 1.
  progress: number;
  // Null on the first step: the account is already made.
  onBack: (() => void) | null;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);
  const filled = useSharedValue(0);

  useEffect(() => {
    filled.value = withTiming(progress, { duration: 350 });
  }, [filled, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: trackWidth * filled.value }));

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.back}>{onBack ? <HeaderBackButton onPress={onBack} /> : null}</View>
      <View
        role="progressbar"
        aria-label={t('setup.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={[styles.track, { backgroundColor: colors.track }]}>
        <Animated.View style={[styles.fill, fillStyle]}>
          <GradientView gradient="bar" style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
      <View style={styles.back} />
    </View>
  );
}

type SetupPageProps = {
  // "Pas 2 de 6"; none on the last screen.
  eyebrow?: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
  // The main button: "Continua", or "Som-hi" at the end.
  continueLabel?: string;
  onContinue: () => void;
  // Greyed out while what's typed can't be saved.
  continueDisabled?: boolean;
  // "Omet": on to the next step, saving nothing. None on the last screen.
  onSkip?: () => void;
  // Centres everything, for the last screen.
  centered?: boolean;
  // Above the title, e.g. the logo on the last screen.
  top?: ReactNode;
};

// One step: its question in big metal capitals, a line on why it's asked,
// what to fill in, and the buttons at the bottom, in reach of the thumb.
export function SetupPage({
  eyebrow,
  title,
  subtitle,
  children,
  continueLabel,
  onContinue,
  continueDisabled = false,
  onSkip,
  centered = false,
  top,
}: SetupPageProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          centered && [styles.centered, { paddingTop: insets.top + spacing.xl }],
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        <Animated.View entering={FadeIn.duration(250)} style={styles.body}>
          {top ? <View style={styles.top}>{top}</View> : null}
          <View style={[styles.heading, centered && styles.headingCentered]}>
            {eyebrow ? (
              <Text variant="eyebrow" color="textMuted">
                {eyebrow}
              </Text>
            ) : null}
            <GradientText
              variant="screenTitle"
              accessibilityRole="header"
              containerStyle={centered ? styles.alignCenter : styles.alignStart}
              style={[styles.title, centered && styles.textCentered]}>
              {title}
            </GradientText>
            <Text color="textMuted" style={centered && styles.textCentered}>
              {subtitle}
            </Text>
          </View>
          {children}
        </Animated.View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={continueLabel ?? t('setup.continue')}
          onPress={onContinue}
          disabled={continueDisabled}
        />
        {onSkip ? <Button label={t('setup.skip')} variant="ghost" onPress={onSkip} /> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  back: {
    width: BACK_SIZE,
    height: BACK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: inset.screenX,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  centered: {
    justifyContent: 'center',
  },
  body: {
    gap: spacing.xl,
  },
  top: {
    alignItems: 'center',
  },
  heading: {
    gap: spacing.sm,
  },
  headingCentered: {
    alignItems: 'center',
  },
  // Italic capitals lean past their box; this keeps the last one's tip
  // inside the gradient.
  title: {
    paddingRight: 4,
  },
  textCentered: {
    textAlign: 'center',
  },
  // The gradient fits the title, not the screen's width.
  alignStart: {
    alignSelf: 'flex-start',
  },
  alignCenter: {
    alignSelf: 'center',
  },
  footer: {
    gap: spacing.xs,
    paddingHorizontal: inset.screenX,
    paddingTop: spacing.md,
  },
});
