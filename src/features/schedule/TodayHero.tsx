import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { GradientText, IconButton, MetalFill, Text, Icon, type IconName } from '@/components/ui';
import { useElapsed } from '@/features/workout/useElapsed';
import { gaps, metalTextShadows, spacing, useTheme } from '@/theme';

import { WeekRing } from './WeekRing';

// The ring and the button in it; "Tot fet" (DayDone) uses the same.
export const RING = 228;
export const BUTTON = 182;

export type HeroAction = { aria: string; icon: IconName; onPress: () => void };

// The big button: GO (to start it) or a ✓ (a class, a sport or an event,
// marked done), with a caption under it, gold for a competition or special
// date; or, while a workout is going, "Reprèn" with its time so far.
export type HeroMain =
  | {
      kind: 'go' | 'done';
      caption: string;
      aria: string;
      onPress: () => void;
      gold?: boolean;
    }
  | { kind: 'resume'; name: string; startedAt: string; onPress: () => void };

// The design's icons are a touch bigger for the eye than for the arrows.
const ICON_SIZES: Partial<Record<IconName, number>> = { eye: 18 };

type TodayHeroProps = {
  // The week ring: the goal's segments, and how many are done.
  segments: number;
  done: number;
  // "3 de 6 entrenaments aquesta setmana".
  progress: string;
  name: string;
  // "En lloc de «…»", after a swap.
  insteadOf: string | null;
  details: string;
  // Null once it's logged.
  main: HeroMain | null;
  // Once logged: how it went ("✓ Fet · 1 h" or "Saltat"), and its ⋯.
  status: { label: string; text: string; skipped: boolean; onPress: () => void } | null;
  actions: HeroAction[];
};

// The middle of Avui: the day's main activity (or the workout going now) as
// a big metal button inside the week's ring, its name and what it is, then
// Previsualitza / Canvia / Salta as small round buttons.
export function TodayHero({
  segments,
  done,
  progress,
  name,
  insteadOf,
  details,
  main,
  status,
  actions,
}: TodayHeroProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();

  return (
    <View style={styles.hero}>
      <WeekRing size={RING} segments={segments} done={done}>
        {main?.kind === 'resume' ? (
          <ResumeButton name={main.name} startedAt={main.startedAt} onPress={main.onPress} />
        ) : main ? (
          <Pressable
            role="button"
            aria-label={main.aria}
            onPress={main.onPress}
            style={({ pressed }) => [
              styles.button,
              { boxShadow: shadows.hero },
              pressed && styles.pressed,
            ]}>
            <MetalFill borderRadius={BUTTON / 2} gradient={main.gold ? 'gold' : 'metal'} />
            {main.kind === 'go' ? (
              <Text variant="hero" color="onMetal" style={metalTextShadows.large}>
                {t('today.go')}
              </Text>
            ) : (
              <Icon name="checkmark" size={52} weight="semibold" tintColor={colors.onMetal} />
            )}
            <Text
              variant="label"
              color="onMetal"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.caption, metalTextShadows.small]}>
              {main.caption}
            </Text>
          </Pressable>
        ) : status ? (
          <Pressable
            role="button"
            aria-label={status.label}
            onPress={status.onPress}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.surface, boxShadow: shadows.hero },
              pressed && styles.pressed,
            ]}>
            <Icon
              name={status.skipped ? 'forward.end' : 'checkmark'}
              size={44}
              weight="light"
              tintColor={status.skipped ? colors.textMuted : colors.accent}
            />
          </Pressable>
        ) : null}
      </WeekRing>
      <Text variant="caption" color="textMuted">
        {progress}
      </Text>

      <View style={styles.what}>
        <GradientText variant="title" accessibilityRole="header" style={styles.centred}>
          {name}
        </GradientText>
        {insteadOf ? (
          <Text variant="caption" color="textMuted" style={styles.centred}>
            {insteadOf}
          </Text>
        ) : null}
        {details !== '' ? (
          <Text variant="caption" color="textMuted" style={styles.centred}>
            {details}
          </Text>
        ) : null}
        {status ? (
          <Text variant="captionMedium" color={status.skipped ? 'textMuted' : 'accent'}>
            {status.text}
          </Text>
        ) : null}
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <IconButton
              key={action.icon}
              icon={action.icon}
              iconSize={ICON_SIZES[action.icon] ?? 16}
              label={action.aria}
              onPress={action.onPress}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

// How far the halo grows past the button: to just inside the ring.
const HALO_GROWTH = 0.2;
const HALO_MS = 1800;

// While a workout is going: deep steel instead of GO's light metal, "▶ EN
// CURS", the time so far in GO's big letters, and "REPRÈN", with a halo
// pulsing out of it (still, with Reduce Motion on). Its own component, so
// only it redraws every second.
function ResumeButton({
  name,
  startedAt,
  onPress,
}: {
  name: string;
  startedAt: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const elapsed = useElapsed(startedAt);

  return (
    <View style={styles.live}>
      <Halo />
      <Pressable
        role="button"
        aria-label={t('workout.resumeFor', { name, time: elapsed })}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { boxShadow: shadows.hero },
          pressed && styles.pressed,
        ]}>
        <MetalFill borderRadius={BUTTON / 2} gradient="live" />
        <View style={styles.liveLabel}>
          <Icon name="play.fill" size={11} tintColor={colors.onMetal} />
          <Text variant="label" color="onMetal" style={metalTextShadows.small}>
            {t('workout.inProgress')}
          </Text>
        </View>
        <Text
          variant="hero"
          color="onMetal"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.time, metalTextShadows.large]}>
          {elapsed}
        </Text>
        <Text
          variant="label"
          color="onMetal"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.caption, metalTextShadows.small]}>
          {t('workout.resume')}
        </Text>
      </Pressable>
    </View>
  );
}

// A soft disc behind the button that grows and fades, over and over, like
// a pulse. Reanimated runs it on the UI thread, so the JS side stays free.
function Halo() {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(
      withRepeat(withTiming(1, { duration: HALO_MS, easing: Easing.out(Easing.quad) }), -1),
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const pulsing = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.get()),
    transform: [{ scale: 1 + HALO_GROWTH * pulse.get() }],
  }));

  return (
    <Animated.View
      style={[
        styles.halo,
        { backgroundColor: colors.accent },
        reduceMotion ? styles.haloStill : pulsing,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: gaps.loose,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: gaps.tight,
  },
  // Kept inside the circle, however long the translation.
  caption: {
    maxWidth: BUTTON - 24,
  },
  live: {
    width: BUTTON,
    height: BUTTON,
  },
  liveLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  // Digits that don't jump as they tick; "1:02:03" shrinks to fit.
  time: {
    maxWidth: BUTTON - 32,
    fontVariant: ['tabular-nums'],
  },
  halo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    pointerEvents: 'none',
  },
  haloStill: {
    opacity: 0.18,
    transform: [{ scale: 1 + HALO_GROWTH / 2 }],
  },
  what: {
    alignItems: 'center',
    gap: gaps.tight,
  },
  centred: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: gaps.wide,
  },
  pressed: {
    opacity: 0.75,
  },
});
