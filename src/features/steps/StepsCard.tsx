import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Button, Card, GradientText, GradientView, Text } from '@/components/ui';
import { useProfile } from '@/features/profile/useProfile';
import { useAppLanguage } from '@/lib/i18n';
import { useTheme } from '@/theme';

import { DEFAULT_STEP_GOAL, stepProgress } from './steps';
import { useTodaySteps } from './useTodaySteps';

const BAR = 3;
const BAR_RADIUS = 2;

// On Avui: "PASSOS" and the percentage, today's steps against your daily
// goal ("6.240 / 10.000", "3.760 per arribar") and a thin bar. Until
// Motion & Fitness is allowed it offers to ask (or, once refused, to open
// Settings); with no step counter it doesn't show.
export function StepsCard({ today }: { today: Date }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { steps, ask } = useTodaySteps(today);
  const { data: profile } = useProfile();
  const goal = profile?.daily_step_goal ?? DEFAULT_STEP_GOAL;

  if (steps.status === 'loading' || steps.status === 'unavailable') return null;

  const label = (
    <Text variant="label" color="textMuted">
      {t('steps.label')}
    </Text>
  );

  if (steps.status !== 'ready') {
    const asking = steps.status === 'ask';
    return (
      <Card>
        {label}
        <Text color="textMuted">{asking ? t('steps.askText') : t('steps.deniedText')}</Text>
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
      <View style={styles.spread}>
        {label}
        <GradientText variant="label">{percent.format(progress.percent / 100)}</GradientText>
      </View>
      <View style={[styles.spread, styles.baseline]}>
        {/* Read as one: "6.240 / 10.000 passos". */}
        <View
          accessible
          aria-label={t('steps.count', {
            steps: number.format(steps.steps),
            goal: number.format(goal),
          })}
          style={styles.baseline}>
          <GradientText variant="stat">{number.format(steps.steps)}</GradientText>
          <Text variant="statUnit" color="textMuted">
            {' '}
            {t('steps.ofGoal', { goal: number.format(goal) })}
          </Text>
        </View>
        <Text variant="captionMedium" color="textMuted">
          {progress.reached
            ? t('steps.reached')
            : t('steps.remaining', { steps: number.format(progress.remaining) })}
        </Text>
      </View>
      <View
        role="progressbar"
        aria-label={t('steps.title')}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(steps.steps, goal)}
        style={[styles.track, { backgroundColor: colors.track }]}>
        <GradientView
          gradient="bar"
          style={[styles.fill, { width: `${progress.fraction * 100}%` }]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  baseline: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  track: {
    height: BAR,
    borderRadius: BAR_RADIUS,
  },
  fill: {
    height: BAR,
    borderRadius: BAR_RADIUS,
  },
});
