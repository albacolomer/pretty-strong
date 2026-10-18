import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text } from '@/components/ui';
import { formatDuration, type Routine } from '@/features/routines/routine';
import { RoutineTypeTag } from '@/features/routines/RoutineTypeTag';
import { useRoutineSummary } from '@/features/routines/useRoutineSummary';
import type { WorkoutSession } from '@/features/workout/session';
import { spacing } from '@/theme';

type TodayRoutineCardProps = {
  // What the week planned.
  planned: Routine;
  // What's shown: the planned routine, or the one it was swapped for.
  shown: Routine;
  // Its session that day, once marked done or skipped.
  session: WorkoutSession | undefined;
  // Days still ahead can't be logged yet.
  canLog: boolean;
  onDone: () => void;
  onSwap: () => void;
  onSkip: () => void;
  // Opens its ⋯ menu; left out when there's nothing to offer there.
  onMenu?: () => void;
};

// One routine planned on the day (spec: TodayCard): type, name and a short
// preview, then Fet / Canvia / Salta, or how the day went. Tapping it opens
// the routine.
export function TodayRoutineCard({
  planned,
  shown,
  session,
  canLog,
  onDone,
  onSwap,
  onSkip,
  onMenu,
}: TodayRoutineCardProps) {
  const { t } = useTranslation();
  const summary = useRoutineSummary(shown, { withDays: false });

  return (
    <Pressable
      role="button"
      onPress={() => router.push({ pathname: '/plan/routines/[id]', params: { id: shown.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.titleRow}>
          <Text variant="cardTitle" style={styles.name}>
            {shown.name}
          </Text>
          <RoutineTypeTag routine={shown} />
          {onMenu ? (
            <MenuButton label={t('exercises.menu.label', { name: shown.name })} onPress={onMenu} />
          ) : null}
        </View>
        {shown.id !== planned.id ? (
          <Text variant="caption" color="textMuted">
            {t('today.insteadOf', { name: planned.name })}
          </Text>
        ) : null}
        {summary !== '' ? <Text color="textMuted">{summary}</Text> : null}

        {session?.status === 'completed' ? (
          <Text variant="bodyStrong" color="accent">
            {[t('today.statusDone'), session.durationS ? formatDuration(session.durationS) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : session?.status === 'skipped' ? (
          <Text variant="bodyStrong" color="textMuted">
            {[
              t('today.statusSkipped'),
              session.changeReason ? t(`workout.reasons.${session.changeReason}`) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : canLog ? (
          <View style={styles.actions}>
            <Button
              label={t('today.done')}
              aria-label={t('today.doneFor', { name: shown.name })}
              onPress={onDone}
              style={styles.action}
            />
            <Button
              label={t('today.swap')}
              aria-label={t('today.swapFor', { name: shown.name })}
              variant="secondary"
              onPress={onSwap}
              style={styles.action}
            />
            <Button
              label={t('today.skip')}
              aria-label={t('today.skipFor', { name: shown.name })}
              variant="secondary"
              onPress={onSkip}
              style={styles.action}
            />
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  action: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
});
