import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, GradientText, Text } from '@/components/ui';
import { formatVolume } from '@/features/profile/progress';
import { formatDuration } from '@/features/routines/routine';
import { useAppLanguage } from '@/lib/i18n';
import { gaps, spacing, useTheme } from '@/theme';

import { BUTTON, RING } from './TodayHero';
import { WeekRing } from './WeekRing';

type DayDoneProps = {
  // The week ring, as on the hero.
  segments: number;
  done: number;
  progress: string;
  // Today's totals: all the time, the weight lifted, and how many
  // exercises beat last time (null while that's worked out).
  timeS: number;
  volumeKg: number;
  beats: number | null;
};

type Tile = { key: string; value: string; label: string; aria: string; beat?: boolean };

// Avui once everything planned is logged and something was done: a ✓ with
// a sparkle in the ring, "Tot fet per avui", and the day in numbers. Each
// number shows only when there's something to show.
export function DayDone({ segments, done, progress, timeS, volumeKg, beats }: DayDoneProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const language = useAppLanguage();

  const stat = (key: string, value: string, label: string): Tile => ({
    key,
    value,
    label,
    aria: t('workout.summary.stat', { label, value }),
  });
  const tiles: Tile[] = [
    ...(timeS > 0 ? [stat('time', formatDuration(timeS), t('today.doneTime'))] : []),
    ...(volumeKg > 0
      ? [stat('volume', formatVolume(volumeKg, language), t('today.doneVolume'))]
      : []),
    ...(beats
      ? [
          {
            key: 'beats',
            value: String(beats),
            label: t('today.doneBeats', { count: beats }),
            aria: t('today.doneBeatsLabel', { count: beats }),
            beat: true,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.done}>
      <WeekRing size={RING} segments={segments} done={done}>
        <View style={[styles.check, { backgroundColor: colors.surface, boxShadow: shadows.hero }]}>
          <SymbolView name="checkmark" size={56} weight="light" tintColor={colors.accent} />
          <SymbolView
            name="sparkles"
            size={26}
            weight="light"
            tintColor={colors.accent}
            style={styles.sparkle}
          />
        </View>
      </WeekRing>
      <Text variant="caption" color="textMuted">
        {progress}
      </Text>
      <GradientText variant="title" accessibilityRole="header" style={styles.centred}>
        {t('today.allDone')}
      </GradientText>

      {tiles.length > 0 ? (
        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <Card key={tile.key} accessible aria-label={tile.aria} style={styles.tile}>
              {tile.beat ? (
                <View style={styles.value}>
                  <SymbolView name="sparkles" size={16} tintColor={colors.up} />
                  <Text variant="cardTitle" color="up">
                    {tile.value}
                  </Text>
                </View>
              ) : (
                <GradientText variant="cardTitle">{tile.value}</GradientText>
              )}
              <Text variant="caption" color="textMuted" style={styles.centred}>
                {tile.label}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  done: {
    alignItems: 'center',
    gap: gaps.loose,
  },
  check: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: BUTTON * 0.22,
    right: BUTTON * 0.22,
  },
  centred: {
    textAlign: 'center',
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
