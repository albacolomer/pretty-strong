import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientText, MetalFill, Text } from '@/components/ui';
import { inset, metalTextShadows, radius, spacing, touch, useTheme } from '@/theme';

import type { ActiveWorkout } from './activeWorkout';
import { useElapsed } from './useElapsed';

const ICON = 44;

// On Today while a workout is going (spec: ResumeBanner): one tap back in,
// also after the app closed or the phone died. The whole card is the
// button: a metal ▶, "EN CURS · TREN SUPERIOR 1", the time so far and a
// metal "Reprèn".
export function ResumeBanner({ workout }: { workout: ActiveWorkout }) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const elapsed = useElapsed(workout.startedAt);
  const name = workout.routineName || t('history.noRoutine');

  return (
    <Pressable
      role="button"
      aria-label={t('workout.resumeFor', { name, time: elapsed })}
      onPress={() => router.push('/workout')}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: colors.surface, boxShadow: shadows.card },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.icon, { boxShadow: shadows.control }]}>
        <MetalFill borderRadius={ICON / 2} />
        <SymbolView name="play.fill" size={18} tintColor={colors.onMetal} />
      </View>
      <View style={styles.text}>
        <Text variant="label" color="accent" numberOfLines={1}>
          {t('workout.resumeBanner', { name })}
        </Text>
        <GradientText variant="stat" containerStyle={styles.elapsed}>
          {elapsed}
        </GradientText>
      </View>
      <View style={[styles.resume, { boxShadow: shadows.control }]}>
        <MetalFill borderRadius={radius.pill} />
        <Text variant="bodyStrong" color="onMetal" style={metalTextShadows.small}>
          {t('workout.resume')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: inset.cardX,
    paddingVertical: inset.cardY,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  // The gradient fits the time, not the whole line.
  elapsed: {
    alignSelf: 'flex-start',
  },
  resume: {
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
