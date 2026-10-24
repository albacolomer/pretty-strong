import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { dateKey, fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { typography, useTheme } from '@/theme';

import type { BodyWeight, WeightRange } from './body';

const HEIGHT = 170;
const TOP = 10;
const BOTTOM = 26;
// Room on the right for the kg labels.
const RIGHT = 40;
const LEFT = 6;
const LABELS = 4;

// Body weight over the range picked (US-28): a line with the area under it,
// placed by date from the range's start to today, the latest weighing
// marked. kg on the right, dates along the bottom.
export function WeightChart({
  weights,
  range,
  start,
  today,
}: {
  // In the range, oldest first.
  weights: BodyWeight[];
  range: WeightRange;
  // The range's first day, "2026-07-25".
  start: string;
  today: Date;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const [width, setWidth] = useState(0);

  const values = weights.map((weight) => weight.weightKg);
  const low = Math.floor(Math.min(...values) - 0.5);
  const high = Math.ceil(Math.max(...values) + 0.5);
  const from = fromDateKey(start).getTime();
  const span = Math.max(1, today.getTime() - from);
  const plotWidth = width - LEFT - RIGHT;
  const x = (date: string) => LEFT + ((fromDateKey(date).getTime() - from) / span) * plotWidth;
  const y = (kg: number) => TOP + ((high - kg) / (high - low)) * (HEIGHT - TOP - BOTTOM);
  const baseline = HEIGHT - BOTTOM;
  const line = weights
    .map((weight, index) => `${index === 0 ? 'M' : 'L'}${x(weight.date)},${y(weight.weightKg)}`)
    .join(' ');
  const area = `${line} L${x(weights.at(-1)!.date)},${baseline} L${x(weights[0].date)},${baseline} Z`;
  const latest = weights.at(-1)!;
  const font = { fontSize: typography.caption.fontSize };
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const dateLabel = new Intl.DateTimeFormat(
    language,
    range === '1m' ? { day: 'numeric', month: 'numeric' } : { month: 'short' },
  );
  const ticks = [high, (high + low) / 2, low];

  return (
    <View
      accessible
      aria-label={t('body.chartLabel', {
        from: number.format(weights[0].weightKg),
        to: number.format(latest.weightKg),
      })}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: HEIGHT }}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {ticks.map((kg) => (
            <Line
              key={`grid-${kg}`}
              x1={LEFT}
              x2={LEFT + plotWidth}
              y1={y(kg)}
              y2={y(kg)}
              stroke={colors.surfaceRaised}
            />
          ))}
          {ticks.map((kg) => (
            <SvgText
              key={`kg-${kg}`}
              x={width}
              y={y(kg) + 4}
              textAnchor="end"
              fill={colors.textMuted}
              {...font}>
              {number.format(kg)}
            </SvgText>
          ))}
          <Path d={area} fill={colors.accentSoft} />
          <Path d={line} stroke={colors.accent} strokeWidth={2.5} fill="none" />
          <Circle
            cx={x(latest.date)}
            cy={y(latest.weightKg)}
            r={5}
            fill={colors.accent}
          />
          {Array.from({ length: LABELS }, (_, index) => {
            const moment = new Date(from + (span * index) / (LABELS - 1));
            const last = index === LABELS - 1;
            return (
              <SvgText
                key={`date-${index}`}
                x={LEFT + (plotWidth * index) / (LABELS - 1)}
                y={HEIGHT - 6}
                textAnchor={index === 0 ? 'start' : last ? 'end' : 'middle'}
                fill={colors.textMuted}
                {...font}>
                {last ? t('history.today') : dateLabel.format(fromDateKey(dateKey(moment)))}
              </SvgText>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
