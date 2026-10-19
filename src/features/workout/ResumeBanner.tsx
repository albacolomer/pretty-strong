import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

import type { ActiveWorkout } from './activeWorkout';
import { useElapsed } from './useElapsed';

// On Today while a workout is going (spec: ResumeBanner): one tap back in,
// also after the app closed or the phone died.
export function ResumeBanner({ workout }: { workout: ActiveWorkout }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const elapsed = useElapsed(workout.startedAt);

  return (
    <Card style={[styles.banner, { borderColor: colors.accent }]}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {t('workout.resumeBanner', { name: workout.routineName })}
          </Text>
          <Text variant="caption" color="textMuted" style={styles.elapsed}>
            {elapsed}
          </Text>
        </View>
        <Button label={t('workout.resume')} onPress={() => router.push('/workout')} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
  elapsed: {
    fontVariant: ['tabular-nums'],
  },
});
