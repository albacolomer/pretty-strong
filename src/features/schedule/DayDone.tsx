import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Card, GradientText, GradientView, MetalFill, Text } from '@/components/ui';
import { useProfile } from '@/features/profile/useProfile';
import { formatDuration } from '@/features/routines/routine';
import { DEFAULT_STEP_GOAL, stepProgress } from '@/features/steps/steps';
import { useTodaySteps } from '@/features/steps/useTodaySteps';
import { useAppLanguage } from '@/lib/i18n';
import { cssGradientPoints, inset, spacing, useTheme } from '@/theme';

type DayDoneProps = {
  today: Date;
  // Today's planned activities: how many were done (not skipped), of all.
  planned: { done: number; count: number };
  // This week's workouts, against the weekly goal (null without one).
  week: { done: number; goal: number | null };
  // Everything done today, added up.
  totals: { durationS: number; volumeKg: number; sets: number };
};

// The ✓ in the middle of the steps ring, and the ✓ alone (a little bigger,
// raised) once the steps are done too.
const RING = 84;
const RING_STROKE = 4;
const CHECK = 64;
const CHECK_ALONE = 72;
const BAR = 3;
const RING_GRADIENT_ID = 'dayDoneSteps';

// Avui once everything planned is logged and something was done. While
// today's steps are under the goal: "GAIREBÉ FET", the ✓ inside a ring
// that fills with them, and how many are left. Then (or with no step
// counter) "TOT FET", with the day's plan and the week. Under it, the day
// in numbers: time, volume, sets and steps.
export function DayDone({ today, planned, week, totals }: DayDoneProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const language = useAppLanguage();
  const { steps } = useTodaySteps(today);
  const { data: profile } = useProfile();
  const goal = profile?.daily_step_goal ?? DEFAULT_STEP_GOAL;
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 0 });

  const progress = steps.status === 'ready' ? stepProgress(steps.steps, goal) : null;
  const almost = progress !== null && !progress.reached;
  // Until the steps are known it can't tell "Gairebé fet" from "Tot fet":
  // the row keeps its place, unseen, rather than switching a moment later.
  const known = steps.status !== 'loading';

  return (
    <>
      <View style={[styles.hero, !known && styles.unknown]}>
        <View style={styles.badge}>
          {almost ? <StepsRing fraction={progress.fraction} /> : null}
          <View
            style={[
              styles.check,
              almost
                ? styles.checkInRing
                : [styles.checkAlone, { boxShadow: shadows.hero }],
            ]}>
            <MetalFill borderRadius={(almost ? CHECK : CHECK_ALONE) / 2} />
            <SymbolView name="checkmark" size={26} weight="semibold" tintColor={colors.onMetal} />
          </View>
        </View>
        <View style={styles.heroText}>
          <GradientText
            variant="heroTitle"
            accessibilityRole="header"
            style={styles.italic}
            containerStyle={styles.fit}>
            {almost ? t('today.almostDone') : t('today.allDone')}
          </GradientText>
          <Text variant="caption" color="textMuted">
            {almost ? (
              <>
                {t('today.activitiesDone')}
                {' · '}
                <Text variant="captionMedium" color="accent">
                  {t('today.stepsToGo', { steps: number.format(progress.remaining) })}
                </Text>
              </>
            ) : (
              [
                t('today.plannedDone', planned),
                week.goal === null
                  ? t('today.weekDone', { count: week.done })
                  : t('today.weekShort', { done: week.done, count: week.goal }),
              ].join(' · ')
            )}
          </Text>
        </View>
      </View>

      <Card style={styles.grid}>
        <View style={styles.gridRow}>
          <Stat
            label={t('today.doneTime')}
            value={totals.durationS > 0 ? formatDuration(totals.durationS) : null}
          />
          <Stat
            label={t('today.doneVolume')}
            value={totals.volumeKg > 0 ? number.format(totals.volumeKg) : null}
            unit="kg"
            divider
          />
        </View>
        <View style={[styles.gridRow, { borderTopWidth: 1, borderTopColor: colors.separator }]}>
          <Stat
            label={t('today.doneSets')}
            value={totals.sets > 0 ? String(totals.sets) : null}
          />
          <Stat
            label={t('steps.label')}
            value={steps.status === 'ready' ? number.format(steps.steps) : null}
            // Out of the goal, with a bar, until it's reached.
            unit={almost ? t('steps.ofGoal', { goal: number.format(goal) }) : undefined}
            fraction={almost ? progress.fraction : undefined}
            divider
          />
        </View>
      </Card>
    </>
  );
}

// One of the day's numbers: "TEMPS" over "2 h 24 min", "—" when there's
// nothing (e.g. no weights on a day of sport).
function Stat({
  label,
  value,
  unit,
  fraction,
  divider = false,
}: {
  label: string;
  value: string | null;
  // After the number, smaller: "kg", "/ 10.000".
  unit?: string;
  // A bar under it, 0–1.
  fraction?: number;
  // A hairline on its left: the second column.
  divider?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      accessible
      aria-label={t('workout.summary.stat', {
        label,
        value: value === null ? '—' : [value, unit].filter(Boolean).join(' '),
      })}
      style={[styles.stat, divider && { borderLeftWidth: 1, borderLeftColor: colors.separator }]}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <View style={styles.figure}>
        {value === null ? (
          <Text variant="figure" color="textMuted">
            —
          </Text>
        ) : (
          <GradientText variant="figure">{value}</GradientText>
        )}
        {value !== null && unit ? (
          <Text variant="caption" color="textMuted">
            {' '}
            {unit}
          </Text>
        ) : null}
      </View>
      {fraction !== undefined ? (
        <View style={[styles.track, { backgroundColor: colors.track }]}>
          <GradientView gradient="bar" style={[styles.fill, { width: `${fraction * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

// The steps so far, as a ring filling clockwise from the top.
function StepsRing({ fraction }: { fraction: number }) {
  const { colors, gradients } = useTheme();
  const r = (RING - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const metal = gradients.ring;
  const { start, end } = cssGradientPoints(metal.angle, 1, 1);

  return (
    <Svg width={RING} height={RING} style={StyleSheet.absoluteFill} aria-hidden>
      <Defs>
        <LinearGradient id={RING_GRADIENT_ID} x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
          {metal.colors.map((color, index) => (
            <Stop key={color} offset={metal.locations[index]} stopColor={color} />
          ))}
        </LinearGradient>
      </Defs>
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        fill="none"
        stroke={colors.border}
        strokeWidth={RING_STROKE}
      />
      <Circle
        cx={RING / 2}
        cy={RING / 2}
        r={r}
        fill="none"
        stroke={`url(#${RING_GRADIENT_ID})`}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={[circumference * fraction, circumference]}
        transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInRing: {
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
  },
  checkAlone: {
    width: CHECK_ALONE,
    height: CHECK_ALONE,
    borderRadius: CHECK_ALONE / 2,
  },
  heroText: {
    flex: 1,
  },
  unknown: {
    opacity: 0,
  },
  // The gradient fits the words, not the whole width.
  fit: {
    alignSelf: 'flex-start',
  },
  // Italic capitals lean past their box; this keeps the last one's tip
  // inside the gradient.
  italic: {
    paddingRight: 4,
  },
  // The cells bring their own padding and hairlines.
  grid: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,
  },
  gridRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: inset.cardX,
    paddingVertical: inset.cardY,
  },
  figure: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  track: {
    height: BAR,
    borderRadius: BAR,
  },
  fill: {
    height: BAR,
    borderRadius: BAR,
  },
});
