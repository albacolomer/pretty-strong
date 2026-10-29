import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import type { ActiveWorkout } from './activeWorkout';
import { useElapsed } from './useElapsed';

const ICON = 44;

// On Today while a workout is going (spec: ResumeBanner): one tap back in,
// also after the app closed or the phone died. The whole card is the
// button: a pink tint, ▶, "En curs · Tren superior 1", the time so far and
// "Reprèn".
export function ResumeBanner({ workout }: { workout: ActiveWorkout }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const elapsed = useElapsed(workout.startedAt);
  const name = workout.routineName || t('history.noRoutine');

  return (
    <Pressable
      role="button"
      aria-label={t('workout.resumeFor', { name, time: elapsed })}
      onPress={() => router.push('/workout')}
      style={({ pressed }) => [
        styles.banner,
        { backgroundColor: colors.accentSoft, borderColor: colors.accent },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.icon, { backgroundColor: colors.accent }]}>
        <SymbolView name="play.fill" size={20} tintColor={colors.onAccent} />
      </View>
      <View style={styles.text}>
        <Text variant="caption" color="accent" numberOfLines={1}>
          {t('workout.resumeBanner', { name })}
        </Text>
        <Text variant="title" style={styles.elapsed}>
          {elapsed}
        </Text>
      </View>
      <View style={[styles.resume, { backgroundColor: colors.accent }]}>
        <Text variant="bodyStrong" color="onAccent">
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
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  elapsed: {
    fontVariant: ['tabular-nums'],
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
