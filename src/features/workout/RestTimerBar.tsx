import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, GradientView, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

import { formatCountdown, isPaused, remainingMs, REST_ADJUST_S, type RestTimer } from './restTimer';
import { useNow } from './useElapsed';

// A rest that ended longer ago than this (the app was closed, or the phone
// locked) already had its notification; no late vibration.
const LATE_END_MS = 3000;

type RestTimerBarProps = {
  rest: RestTimer;
  // "Següent: Rem assegut, sèrie 3".
  nextLabel: string;
  onPause: () => void;
  onResume: () => void;
  onAdjust: (deltaS: number) => void;
  onSkip: () => void;
  onEnd: () => void;
};

// The rest countdown at the bottom of the workout (spec: RestTimerBar):
// big enough to read at arm's length, with −15 s / +15 s, pause and skip.
// When it reaches 0, the phone vibrates and the bar goes.
export function RestTimerBar({
  rest,
  nextLabel,
  onPause,
  onResume,
  onAdjust,
  onSkip,
  onEnd,
}: RestTimerBarProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow(250);
  const left = remainingMs(rest, now);
  const paused = isPaused(rest);
  const time = formatCountdown(left);
  const progress = rest.totalS > 0 ? Math.min(1, left / (rest.totalS * 1000)) : 0;

  useEffect(() => {
    if (paused || left > 0) return;
    // Gym UX rule 6: a vibration when rest ends.
    const endedAgo = Date.now() - new Date(rest.endsAt ?? 0).getTime();
    if (endedAgo < LATE_END_MS) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onEnd();
  });

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          boxShadow: shadows.card,
          paddingBottom: insets.bottom + spacing.sm,
        },
      ]}>
      <View style={[styles.track, { backgroundColor: colors.track }]}>
        <GradientView gradient="bar" style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>
      <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.center}>
        {[t('workout.rest'), nextLabel].filter(Boolean).join(' · ')}
      </Text>
      <View style={styles.row}>
        <Button
          label={t('workout.restMinus')}
          aria-label={t('workout.restMinusLabel', { seconds: REST_ADJUST_S })}
          variant="secondary"
          onPress={() => onAdjust(-REST_ADJUST_S)}
          style={styles.adjust}
        />
        <Text
          variant="timer"
          color={paused ? 'textMuted' : 'text'}
          aria-label={t('workout.restLeft', { time })}
          style={styles.time}>
          {time}
        </Text>
        <Button
          label={t('workout.restPlus')}
          aria-label={t('workout.restPlusLabel', { seconds: REST_ADJUST_S })}
          variant="secondary"
          onPress={() => onAdjust(REST_ADJUST_S)}
          style={styles.adjust}
        />
      </View>
      <View style={styles.row}>
        <Button
          label={paused ? t('workout.resumeRest') : t('workout.pauseRest')}
          variant="secondary"
          onPress={paused ? onResume : onPause}
          style={styles.action}
        />
        <Button
          label={t('workout.skipRest')}
          onPress={onSkip}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  track: {
    height: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progress: {
    height: 4,
  },
  center: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  adjust: {
    paddingHorizontal: spacing.md,
  },
  time: {
    flex: 1,
    textAlign: 'center',
  },
  action: {
    flex: 1,
  },
});
