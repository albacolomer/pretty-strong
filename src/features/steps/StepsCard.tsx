import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useProfile } from '@/features/profile/useProfile';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { DEFAULT_STEP_GOAL, stepProgress } from './steps';
import { useTodaySteps } from './useTodaySteps';

const ICON = 40;
const BAR = 8;

// On Avui: today's steps against your daily goal, "6.240 / 10.000 passos ·
// 3.760 per arribar", the percentage and a bar. Until Motion & Fitness is
// allowed it offers to ask (or, once refused, to open Settings); with no
// step counter it doesn't show.
export function StepsCard({ today }: { today: Date }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { steps, ask } = useTodaySteps(today);
  const { data: profile } = useProfile();
  const goal = profile?.daily_step_goal ?? DEFAULT_STEP_GOAL;

  if (steps.status === 'loading' || steps.status === 'unavailable') return null;

  const icon = (
    <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
      <SymbolView name="figure.walk" size={22} tintColor={colors.accent} />
    </View>
  );

  if (steps.status !== 'ready') {
    const asking = steps.status === 'ask';
    return (
      <Card>
        <View style={styles.row}>
          {icon}
          <View style={styles.text}>
            <Text variant="bodyStrong">{t('steps.title')}</Text>
            <Text variant="caption" color="textMuted">
              {asking ? t('steps.askText') : t('steps.deniedText')}
            </Text>
          </View>
        </View>
        <Button
          label={asking ? t('steps.allow') : t('steps.openSettings')}
          variant="secondary"
          onPress={asking ? ask : () => void Linking.openSettings()}
        />
      </Card>
    );
  }

  const number = new Intl.NumberFormat(language);
  const percent = new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 });
  const progress = stepProgress(steps.steps, goal);

  return (
    <Card>
      <View style={styles.row}>
        {icon}
        <View style={styles.text}>
          <Text variant="bodyStrong">
            {t('steps.count', { steps: number.format(steps.steps), goal: number.format(goal) })}
          </Text>
          <Text variant="caption" color="textMuted">
            {progress.reached
              ? t('steps.reached')
              : t('steps.remaining', { steps: number.format(progress.remaining) })}
          </Text>
        </View>
        <Text variant="bodyStrong" color="accent">
          {percent.format(progress.percent / 100)}
        </Text>
      </View>
      <View
        role="progressbar"
        aria-label={t('steps.title')}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(steps.steps, goal)}
        style={[styles.track, { backgroundColor: colors.surfaceRaised }]}>
        <View
          style={[
            styles.fill,
            { width: `${progress.fraction * 100}%`, backgroundColor: colors.accent },
          ]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
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
  text: {
    flex: 1,
  },
  track: {
    height: BAR,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: BAR,
    borderRadius: radius.pill,
  },
});
