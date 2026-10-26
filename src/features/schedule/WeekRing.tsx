import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/theme';

const STROKE = 10;
// The gap between segments, in degrees.
const GAP = 7;

// A point on the circle, 0° at the top, clockwise.
function point(centre: number, r: number, degrees: number): [number, number] {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [centre + r * Math.cos(radians), centre + r * Math.sin(radians)];
}

function arc(centre: number, r: number, from: number, to: number): string {
  const [x1, y1] = point(centre, r, from);
  const [x2, y2] = point(centre, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

// The week around Avui's main button: one segment per workout of the
// week's goal, filled pink as they're done, clockwise from the top.
export function WeekRing({
  size,
  segments,
  done,
  children,
}: {
  size: number;
  segments: number;
  done: number;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const centre = size / 2;
  const r = centre - STROKE / 2 - 2;
  const each = 360 / segments;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {segments === 1 ? (
          <Circle
            cx={centre}
            cy={centre}
            r={r}
            stroke={done > 0 ? colors.accent : colors.accentSoft}
            strokeWidth={STROKE}
            fill="none"
          />
        ) : (
          Array.from({ length: segments }, (_, index) => (
            <Path
              key={index}
              d={arc(centre, r, index * each + GAP / 2, (index + 1) * each - GAP / 2)}
              stroke={index < done ? colors.accent : colors.accentSoft}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
            />
          ))
        )}
      </Svg>
      <View style={styles.centre}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
