import { selectionAsync } from 'expo-haptics';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { Card, GradientText, GradientView, MetalFill, SectionHeader, Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { FEELING_MAX, FEELING_MIN, feelingMood, type Feeling } from './session';

const THUMB = 30;
const RAIL = 6;
const TICK = 4;
const STEPS = FEELING_MAX - FEELING_MIN;
// Where the first move or VoiceOver swipe starts from when nothing's set.
const MIDDLE = FEELING_MIN + STEPS / 2;

function clamp(value: number): Feeling {
  return Math.min(Math.max(value, FEELING_MIN), FEELING_MAX);
}

// "Com t'has sentit?" 0 to 10 (US-21), in the finish summary and when
// editing a past workout: the number and its word ("7 · Molt bé"), over a
// line with a metal thumb to slide, or tap anywhere on. It snaps to whole
// steps, with a light tick on each. Optional: "Treu" clears it.
export function FeelingSlider({
  value,
  onChange,
}: {
  value: Feeling | null;
  onChange: (feeling: Feeling | null) => void;
}) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const [width, setWidth] = useState(0);
  // The line's left edge on screen, found when the finger lands.
  const originX = useRef(0);
  // The thumb's centre travels between the line's ends, less half a thumb.
  const usable = Math.max(width - THUMB, 0);
  const shown = value ?? MIDDLE;
  const left = (usable * (shown - FEELING_MIN)) / STEPS;
  const mood = value === null ? null : t(`workout.summary.moods.${feelingMood(value)}`);

  function set(next: Feeling) {
    if (next === value) return;
    void selectionAsync();
    onChange(next);
  }

  function follow(event: GestureResponderEvent) {
    if (usable === 0) return;
    const x = event.nativeEvent.pageX - originX.current - THUMB / 2;
    set(clamp(FEELING_MIN + Math.round((x / usable) * STEPS)));
  }

  function land(event: GestureResponderEvent) {
    // The children don't take touches, so locationX is from the line's edge.
    originX.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
    follow(event);
  }

  function onAction(event: AccessibilityActionEvent) {
    const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
    set(value === null ? MIDDLE : clamp(value + step));
  }

  return (
    <View style={styles.section}>
      <SectionHeader title={t('workout.summary.feeling')} />
      <Card style={styles.card}>
        <View style={styles.readout}>
          {value === null ? (
            <Text variant="figure" color="textMuted">
              —
            </Text>
          ) : (
            <GradientText variant="figure">{String(value)}</GradientText>
          )}
          <Text variant="caption" color="textMuted" style={styles.outOf}>
            / {FEELING_MAX}
          </Text>
          <Text
            variant="bodyStrong"
            color={mood ? 'accent' : 'textMuted'}
            numberOfLines={1}
            style={styles.mood}>
            {mood ?? t('workout.summary.feelingNone')}
          </Text>
          {value !== null ? (
            <Pressable
              role="button"
              aria-label={t('workout.summary.feelingClear')}
              onPress={() => onChange(null)}
              hitSlop={spacing.md}
              style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
              <Text variant="caption" color="textMuted">
                {t('workout.summary.clear')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          accessible
          accessibilityRole="adjustable"
          aria-label={t('workout.summary.feeling')}
          aria-valuemin={FEELING_MIN}
          aria-valuemax={FEELING_MAX}
          aria-valuenow={value ?? undefined}
          aria-valuetext={
            value === null
              ? t('workout.summary.feelingNone')
              : t('workout.summary.feelingValue', { value, mood })
          }
          accessibilityHint={t('workout.summary.feelingHint')}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAction}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          // A sideways slide stays here instead of scrolling the page.
          onResponderTerminationRequest={() => false}
          onResponderGrant={land}
          onResponderMove={follow}
          style={styles.track}>
          <View
            style={[styles.rail, { backgroundColor: colors.track }]}
            pointerEvents="none">
            {Array.from({ length: STEPS + 1 }, (_, step) => (
              <View
                key={step}
                style={[
                  styles.tick,
                  {
                    left: THUMB / 2 + (usable * step) / STEPS - TICK / 2,
                    backgroundColor: colors.control,
                  },
                ]}
              />
            ))}
          </View>
          {value !== null ? (
            <GradientView
              gradient="bar"
              pointerEvents="none"
              style={[styles.fill, { width: left + THUMB / 2 }]}
            />
          ) : null}
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              { left, boxShadow: shadows.control },
              value === null && styles.unset,
            ]}>
            <MetalFill borderRadius={THUMB / 2} />
          </View>
        </View>

        <View style={styles.ends} aria-hidden>
          <Text variant="caption" color="textMuted">
            {FEELING_MIN}
          </Text>
          <Text variant="caption" color="textMuted">
            {FEELING_MAX}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  card: {
    gap: spacing.xs,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  outOf: {
    marginLeft: spacing.xs,
  },
  mood: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clear: {
    alignSelf: 'center',
  },
  // A full touch's height, though the line itself is thin.
  track: {
    height: touch.min,
    justifyContent: 'center',
  },
  rail: {
    height: RAIL,
    borderRadius: radius.pill,
  },
  tick: {
    position: 'absolute',
    top: (RAIL - TICK) / 2,
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: (touch.min - RAIL) / 2,
    height: RAIL,
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    top: (touch.min - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
  // Not chosen yet: a faint thumb in the middle, waiting.
  unset: {
    opacity: 0.45,
  },
  ends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.75,
  },
});
