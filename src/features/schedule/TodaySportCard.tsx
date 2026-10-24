import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text } from '@/components/ui';
import { formatDuration } from '@/features/routines/routine';
import type { WorkoutSession } from '@/features/workout/session';
import { radius, spacing, useTheme } from '@/theme';

import { SPORT_ICONS, type WeeklySport } from './sports';
import { useActivityName } from './useActivityName';

type TodaySportCardProps = {
  sport: WeeklySport;
  // Its session that day, once marked done or skipped.
  session: WorkoutSession | undefined;
  // Days still ahead can't be logged yet.
  canLog: boolean;
  onDone: () => void;
  onSkip: () => void;
  // Opens its ⋯ menu ("Desfés"), once logged.
  onMenu?: () => void;
};

// A sport planned on the day: its icon, name, time and duration, then
// Fet / Salta, or how the day went. Like a class, it's marked done rather
// than started.
export function TodaySportCard({ sport, session, canLog, onDone, onSkip, onMenu }: TodaySportCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name = useActivityName()({ kind: 'sport', sport });
  const plan = [sport.startTime, sport.durationS ? formatDuration(sport.durationS) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card>
      <View style={styles.titleRow}>
        <View style={[styles.icon, { borderColor: colors.textMuted }]}>
          <SymbolView name={SPORT_ICONS[sport.sport]} size={20} tintColor={colors.text} />
        </View>
        <Text variant="cardTitle" style={styles.name}>
          {name}
        </Text>
        {onMenu ? (
          <MenuButton label={t('exercises.menu.label', { name })} onPress={onMenu} />
        ) : null}
      </View>
      {plan !== '' ? <Text color="textMuted">{plan}</Text> : null}

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
            aria-label={t('today.doneFor', { name })}
            onPress={onDone}
            style={styles.action}
          />
          <Button
            label={t('today.skip')}
            aria-label={t('today.skipFor', { name })}
            variant="secondary"
            onPress={onSkip}
            style={styles.action}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.input,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
