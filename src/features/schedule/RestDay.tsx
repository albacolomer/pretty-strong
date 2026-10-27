import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { dayNumber } from './dates';
import { RECOVERY_SPORTS, SPORT_ICONS, type Sport } from './sports';

const ICON = 40;

// A different one each day, in turn.
const MESSAGES = ['today.restMessage1', 'today.restMessage2', 'today.restMessage3'] as const;

type RestDayProps = {
  today: Date;
  // The next day with something planned: "Demà" (or its weekday) and what's
  // on it, "Tren inferior 1 · Pàdel 19:00". Null with nothing planned.
  next: { day: string; plan: string } | null;
  // Caminar or Estiraments, done today.
  onLog: (sport: Sport) => void;
};

// Avui with nothing planned: a word on recovery, what comes next, and a
// quick way to log a walk or some stretching.
export function RestDay({ today, next, onLog }: RestDayProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const message = MESSAGES[dayNumber(today) % MESSAGES.length];

  return (
    <View style={styles.rest}>
      <Card style={styles.card}>
        <View style={styles.title}>
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
            <SymbolView name="moon.zzz.fill" size={20} tintColor={colors.accent} />
          </View>
          <Text variant="cardTitle" accessibilityRole="header">
            {t('today.rest')}
          </Text>
        </View>
        <Text color="textMuted">{t(message)}</Text>
        {next ? (
          <View style={[styles.next, { borderTopColor: colors.surfaceRaised }]}>
            <Text variant="caption" color="textMuted">
              {next.day}
            </Text>
            <Text variant="bodyStrong">{next.plan}</Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.move}>
        <Text variant="bodyStrong" color="textMuted">
          {t('today.restMove')}
        </Text>
        <View style={styles.buttons}>
          {RECOVERY_SPORTS.map((sport) => {
            const name = t(`sports.${sport}`);
            return (
              <Pressable
                key={sport}
                role="button"
                aria-label={t('today.logRecovery', { name })}
                onPress={() => onLog(sport)}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceRaised },
                  pressed && styles.pressed,
                ]}>
                <SymbolView name={SPORT_ICONS[sport]} size={24} tintColor={colors.accent} />
                <Text variant="bodyStrong">{name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rest: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  next: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  move: {
    gap: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: touch.check,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
