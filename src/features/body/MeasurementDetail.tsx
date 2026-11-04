import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, GradientText, SegmentedControl, Text } from '@/components/ui';
import { formatShortDate } from '@/features/history/entries';
import { dateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, touch, useTheme } from '@/theme';

import { BodyChart } from './BodyChart';
import {
  BODY_RANGES,
  changeOver,
  formatSigned,
  inRange,
  measurementHistory,
  parseMeasurementKey,
  rangeStart,
  type BodyRange,
} from './body';
import { useMeasurements } from './useBody';
import { useMeasurementName } from './useMeasurementName';

// Body → one measurement (US-28): its latest value, a chart over the range
// picked, and every time it was taken, newest first. Measurements come
// about once a month, so the chart starts on a year.
export function MeasurementDetail({ measurementKey }: { measurementKey: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const today = useToday();
  const nameOf = useMeasurementName();
  const { data: measurements = [], isPending, isError } = useMeasurements();
  const [range, setRange] = useState<BodyRange>('1y');

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('body.loadError')}</Text>;

  const history = measurementHistory(measurements, measurementKey);
  if (history.length === 0) return <Text color="textMuted">{t('body.noMeasurement')}</Text>;

  const name = nameOf(parseMeasurementKey(measurementKey));
  const latest = history[0];
  const shown = inRange(history, range, today);
  const change = changeOver(shown.map((measurement) => measurement.valueCm));
  const cm = new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const logged =
    latest.date === dateKey(today)
      ? t('body.loggedToday')
      : t('body.loggedOn', { date: formatShortDate(latest.date, language) });

  return (
    <View style={styles.page}>
      <Card style={styles.card}>
        <View>
          <View style={styles.big} accessible aria-label={`${cm.format(latest.valueCm)} cm`}>
            <GradientText variant="display">{cm.format(latest.valueCm)}</GradientText>
            <Text variant="cardTitle" color="textMuted">
              cm
            </Text>
          </View>
          <Text variant="caption" color="textMuted">
            {[
              change === null
                ? null
                : t('body.change', {
                    change: `${formatSigned(change, language, 1)} cm`,
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
          options={BODY_RANGES.map((value) => ({ value, label: t(`body.ranges.${value}`) }))}
        />
        {shown.length >= 2 ? (
          <BodyChart
            points={shown.map((measurement) => ({
              date: measurement.date,
              value: measurement.valueCm,
            }))}
            label={t('body.measurementChartLabel', {
              name,
              from: number.format(shown[0].valueCm),
              to: number.format(shown.at(-1)!.valueCm),
            })}
            range={range}
            start={rangeStart(range, today)}
            today={today}
          />
        ) : (
          <Text variant="caption" color="textMuted">
            {t('body.fewMeasurements')}
          </Text>
        )}
      </Card>

      <Card>
        <Text variant="label" color="textMuted" accessibilityRole="header">
          {t('body.history')}
        </Text>
        {history.map((measurement) => (
          <View
            key={measurement.date}
            accessible
            aria-label={`${cm.format(measurement.valueCm)} cm, ${formatShortDate(measurement.date, language)}`}
            style={styles.row}>
            <Text style={styles.grow}>{formatShortDate(measurement.date, language)}</Text>
            <View style={styles.value}>
              <Text variant="bodyStrong">{cm.format(measurement.valueCm)}</Text>
              <Text variant="caption" color="textMuted">
                cm
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  card: {
    gap: spacing.md,
  },
  big: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
  },
  grow: {
    flex: 1,
  },
  value: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
});
