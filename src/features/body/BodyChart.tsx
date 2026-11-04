import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { dateKey, fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { typography, useTheme } from '@/theme';

import type { BodyRange } from './body';

export type ChartPoint = { date: string; value: number };

const HEIGHT = 170;
const TOP = 10;
const BOTTOM = 26;
// Room on the right for the kg or cm labels.
const RIGHT = 40;
const LEFT = 6;
const LABELS = 4;

// Body weight or a measurement over the range picked (US-28): a line with
// the area under it, placed by date from the range's start to today, the
// latest value marked. kg or cm on the right, dates along the bottom.
export function BodyChart({
  points,
  label,
  range,
  start,
  today,
}: {
  // In the range, oldest first.
  points: ChartPoint[];
  // What VoiceOver reads: "Pes de 62,9 a 61,4 kg."
  label: string;
  range: BodyRange;
  // The range's first day, "2026-07-25".
  start: string;
  today: Date;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const [width, setWidth] = useState(0);
  // Two charts on one page each need their own gradient.
  const gradientId = useId();

  const values = points.map((point) => point.value);
  const low = Math.floor(Math.min(...values) - 0.5);
  const high = Math.ceil(Math.max(...values) + 0.5);
  const from = fromDateKey(start).getTime();
  const span = Math.max(1, today.getTime() - from);
  const plotWidth = width - LEFT - RIGHT;
  const x = (date: string) => LEFT + ((fromDateKey(date).getTime() - from) / span) * plotWidth;
  const y = (value: number) => TOP + ((high - value) / (high - low)) * (HEIGHT - TOP - BOTTOM);
  const baseline = HEIGHT - BOTTOM;
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.date)},${y(point.value)}`)
    .join(' ');
  const area = `${line} L${x(points.at(-1)!.date)},${baseline} L${x(points[0].date)},${baseline} Z`;
  const latest = points.at(-1)!;
  // SVG text doesn't take the app's text styles: the font is named here.
  const font = {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
  };
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: 1 });
  const dateLabel = new Intl.DateTimeFormat(
    language,
    range === '1m' ? { day: 'numeric', month: 'numeric' } : { month: 'short' },
  );
  const ticks = [high, (high + low) / 2, low];

  return (
    <View
      accessible
      aria-label={label}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: HEIGHT }}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            {/* The area under the line fades out downwards. */}
            <LinearGradient id={gradientId} x1={0} y1={0} x2={0} y2={1}>
              <Stop offset={0} stopColor={colors.accent} stopOpacity={0.22} />
              <Stop offset={1} stopColor={colors.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {ticks.map((tick) => (
            <Line
              key={`grid-${tick}`}
              x1={LEFT}
              x2={LEFT + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
              stroke={colors.border}
            />
          ))}
          {ticks.map((tick) => (
            <SvgText
              key={`label-${tick}`}
              x={width}
              y={y(tick) + 4}
              textAnchor="end"
              fill={colors.textMuted}
              {...font}>
              {number.format(tick)}
            </SvgText>
          ))}
          <Path d={area} fill={`url(#${gradientId})`} />
          <Path d={line} stroke={colors.accent} strokeWidth={2.5} fill="none" />
          <Circle
            cx={x(latest.date)}
            cy={y(latest.value)}
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
