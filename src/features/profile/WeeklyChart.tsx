import { useState } from 'react';
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

import { fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { fonts, typography, useTheme } from '@/theme';

import type { WeekPoint } from './progress';

const HEIGHT = 170;
// Room for the counts above the dots and the dates under them.
const TOP = 24;
const BOTTOM = 28;
const SIDE = 20;
const DOT = 5;

// Workouts per week (US-26): a line through the finished weeks with the
// area under it, then a dashed step to this week, still going. A dashed
// line marks the goal; weeks that reached it have a full dot, the others
// an empty one.
export function WeeklyChart({ points, goal }: { points: WeekPoint[]; goal: number | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const [width, setWidth] = useState(0);

  const max = Math.max(1, goal ?? 0, ...points.map((point) => point.count));
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const x = (index: number) => SIDE + (index * (width - 2 * SIDE)) / Math.max(1, points.length - 1);
  const y = (count: number) => TOP + (1 - count / (max + 0.5)) * plotHeight;
  const baseline = y(0);
  const finished = points.filter((point) => !point.current);
  const line = finished
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(point.count)}`)
    .join(' ');
  const area =
    finished.length > 0
      ? `${line} L${x(finished.length - 1)},${baseline} L${x(0)},${baseline} Z`
      : '';
  const short = new Intl.DateTimeFormat(language, { day: 'numeric', month: 'numeric' });
  // SVG text doesn't take the app's text styles: the font is named here.
  const font = {
    fontSize: typography.caption.fontSize,
    fontFamily: typography.caption.fontFamily,
  };

  const described = t('progress.chartLabel', {
    counts: finished.map((point) => point.count).join(', '),
    current: points.at(-1)?.count ?? 0,
  });

  return (
    <View
      accessible
      aria-label={goal === null ? described : `${described} ${t('progress.goal', { count: goal })}`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: HEIGHT }}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            {/* The area under the line fades out downwards. */}
            <LinearGradient id="weeklyArea" x1={0} y1={0} x2={0} y2={1}>
              <Stop offset={0} stopColor={colors.accent} stopOpacity={0.22} />
              <Stop offset={1} stopColor={colors.accent} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {area ? <Path d={area} fill="url(#weeklyArea)" /> : null}
          {goal !== null ? (
            <>
              <Line
                x1={SIDE}
                x2={width - SIDE}
                y1={y(goal)}
                y2={y(goal)}
                stroke={colors.textMuted}
                strokeDasharray="4 4"
              />
              <SvgText
                x={width - SIDE}
                y={y(goal) - 6}
                textAnchor="end"
                fill={colors.textMuted}
                {...font}>
                {t('progress.goal', { count: goal })}
              </SvgText>
            </>
          ) : null}
          <Path d={line} stroke={colors.accent} strokeWidth={2.5} fill="none" />
          {finished.length > 0 && points.at(-1)?.current ? (
            <Line
              x1={x(finished.length - 1)}
              y1={y(finished.at(-1)!.count)}
              x2={x(points.length - 1)}
              y2={y(points.at(-1)!.count)}
              stroke={colors.accent}
              strokeWidth={2.5}
              strokeDasharray="5 5"
            />
          ) : null}
          {points.map((point, index) => {
            const full = !point.current && (goal === null || point.count >= goal);
            return (
              <Circle
                key={point.weekStart}
                cx={x(index)}
                cy={y(point.count)}
                r={point.current ? DOT + 1 : DOT}
                fill={full ? colors.accent : colors.surface}
                stroke={colors.accent}
                strokeWidth={2}
              />
            );
          })}
          {points.map((point, index) => (
            <SvgText
              key={`count-${point.weekStart}`}
              x={x(index)}
              y={y(point.count) - 10}
              textAnchor="middle"
              fill={point.current ? colors.text : colors.textMuted}
              {...font}
              fontFamily={point.current ? fonts.bold : fonts.regular}>
              {point.count}
            </SvgText>
          ))}
          {points.map((point, index) => (
            <SvgText
              key={`week-${point.weekStart}`}
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor="middle"
              fill={point.current ? colors.text : colors.textMuted}
              {...font}
              fontFamily={point.current ? fonts.bold : fonts.regular}>
              {point.current ? t('progress.now') : short.format(fromDateKey(point.weekStart))}
            </SvgText>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
