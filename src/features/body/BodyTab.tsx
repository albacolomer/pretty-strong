import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, GradientText, SegmentedControl, Text } from '@/components/ui';
import { formatShortDate } from '@/features/history/entries';
import { dateKey, fromDateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { useAppLanguage, type Language } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import {
  latestMeasurements,
  measurementDays,
  rangeStart,
  WEIGHT_RANGES,
  weightChange,
  weightsInRange,
  type MeasurementSummary,
  type WeightRange,
} from './body';
import { LogWeightSheet } from './LogWeightSheet';
import { MeasurementsSheet } from './MeasurementsSheet';
import { ProgressPhotos } from './ProgressPhotos';
import { useMeasurements, useWeights } from './useBody';
import { useMeasurementName } from './useMeasurementName';
import { WeightChart } from './WeightChart';

// "−1,5" and "+0,5": a change with its sign.
function signed(value: number, language: Language, digits: number): string {
  const number = new Intl.NumberFormat(language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  return `${value < 0 ? '−' : value > 0 ? '+' : ''}${number}`;
}

// Profile → Body (US-28): body weight over time, measurements with their
// change since the time before, and progress photos.
export function BodyTab() {
  return (
    <View style={styles.page}>
      <WeightCard />
      <MeasurementsCard />
      <ProgressPhotos />
    </View>
  );
}

function WeightCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const today = useToday();
  const { data: weights = [], isPending } = useWeights();
  const [range, setRange] = useState<WeightRange>('3m');
  const [logging, setLogging] = useState(false);

  const latest = weights[0] ?? null;
  const inRange = weightsInRange(weights, range, today);
  const change = weightChange(inRange);
  const kg = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const todayKey = dateKey(today);
  const logged =
    latest === null
      ? null
      : latest.date === todayKey
        ? t('body.loggedToday')
        : t('body.loggedOn', { date: formatShortDate(latest.date, language) });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" color="textMuted" accessibilityRole="header" style={styles.grow}>
          {t('body.weight')}
        </Text>
        {weights.length > 0 ? (
          <Link label={t('body.history')} onPress={() => router.push('/profile/weights')} />
        ) : null}
      </View>

      {isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : latest === null ? (
        <Text color="textMuted">{t('body.noWeight')}</Text>
      ) : (
        <>
          <View>
            <View style={styles.big} accessible aria-label={`${kg.format(latest.weightKg)} kg`}>
              <GradientText variant="display">{kg.format(latest.weightKg)}</GradientText>
              <Text variant="cardTitle" color="textMuted">
                kg
              </Text>
            </View>
            <Text variant="caption" color="textMuted">
              {[
                change === null
                  ? null
                  : t('body.change', {
                      change: `${signed(change, language, 1)} kg`,
                      range: t(`body.rangeIn.${range}`),
                    }),
                logged,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <SegmentedControl
            label={t('body.range')}
            value={range}
            onChange={setRange}
            options={WEIGHT_RANGES.map((value) => ({ value, label: t(`body.ranges.${value}`) }))}
          />
          {inRange.length >= 2 ? (
            <WeightChart
              weights={inRange}
              range={range}
              start={rangeStart(range, today)}
              today={today}
            />
          ) : (
            <Text variant="caption" color="textMuted">
              {t('body.fewWeights')}
            </Text>
          )}
        </>
      )}

      <Button label={t('body.logWeightButton')} onPress={() => setLogging(true)} />
      <LogWeightSheet
        visible={logging}
        latestKg={latest?.weightKg ?? null}
        onClose={() => setLogging(false)}
      />
    </Card>
  );
}

function MeasurementsCard() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const { data: measurements = [], isPending } = useMeasurements();
  // Which sheet is open: editing them all, or adding one of your own.
  const [sheet, setSheet] = useState<'edit' | 'add' | null>(null);

  const summaries = latestMeasurements(measurements);
  const { latest, previous } = measurementDays(measurements);
  const short = (date: string) =>
    new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(fromDateKey(date));

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text variant="label" color="textMuted" accessibilityRole="header">
            {t('body.measurements')}
          </Text>
          {latest ? (
            <Text variant="caption" color="textMuted">
              {[
                t('body.updated', { date: short(latest) }),
                previous ? t('body.changeSince', { date: short(previous) }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
        </View>
        <Link label={t('body.edit')} onPress={() => setSheet('edit')} />
      </View>

      {isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.tiles}>
          {summaries.map((summary) => (
            <MeasurementTile key={summary.key} summary={summary} language={language} />
          ))}
          <Pressable
            role="button"
            onPress={() => setSheet('add')}
            style={({ pressed }) => [
              styles.tile,
              styles.addTile,
              { borderColor: colors.control },
              pressed && styles.pressed,
            ]}>
            <Text variant="bodyStrong">{t('body.add')}</Text>
          </Pressable>
        </View>
      )}

      <MeasurementsSheet
        visible={sheet !== null}
        adding={sheet === 'add'}
        measurements={summaries}
        onClose={() => setSheet(null)}
      />
    </Card>
  );
}

function MeasurementTile({ summary, language }: { summary: MeasurementSummary; language: Language }) {
  const { colors } = useTheme();
  const nameOf = useMeasurementName();
  const cm = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const name = nameOf(summary);
  const value = summary.valueCm === null ? '–' : cm.format(summary.valueCm);

  return (
    <View
      accessible
      aria-label={[
        name,
        summary.valueCm === null ? '–' : `${value} cm`,
        summary.changeCm === null ? null : signed(summary.changeCm, language, 1),
      ]
        .filter(Boolean)
        .join(', ')}
      style={[styles.tile, { backgroundColor: colors.accentSoft }]}>
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.value}>
        <Text variant="cardTitle">{value}</Text>
        {summary.valueCm === null ? null : (
          <Text variant="caption" color="textMuted">
            cm
          </Text>
        )}
      </View>
      {summary.changeCm === null ? null : (
        <Text variant="caption" color="textMuted">
          {signed(summary.changeCm, language, 1)}
        </Text>
      )}
    </View>
  );
}

// A pink text button in a card's corner: "Historial", "Edita".
function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      role="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Text variant="bodyStrong" color="accent">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  big: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  link: {
    minHeight: touch.min,
    justifyContent: 'center',
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '40%',
    flexGrow: 1,
    minHeight: 88,
    padding: spacing.md,
    borderRadius: radius.input,
    gap: 2,
  },
  addTile: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
});
