import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { cssGradientPoints, useTheme } from '@/theme';

import { RING_BOX, RING_RADIUS, ringDashes } from './ring';

const CENTRE = RING_BOX / 2;
// One ring on screen at a time, so a fixed id is safe.
const GRADIENT_ID = 'weekRingMetal';

// The week around Avui's main button: one thin segment per workout of the
// week's goal, with the done ones in brushed metal, clockwise from the top.
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
  const { colors, gradients } = useTheme();
  const dashes = ringDashes(segments, done);
  const metal = gradients.ring;
  // The gradient's direction across the ring's square box.
  const { start, end } = cssGradientPoints(metal.angle, 1, 1);
  const rotate = `rotate(${dashes.rotation} ${CENTRE} ${CENTRE})`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
        style={StyleSheet.absoluteFill}
        aria-hidden>
        <Defs>
          <LinearGradient id={GRADIENT_ID} x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
            {metal.colors.map((color, index) => (
              <Stop key={color} offset={metal.locations[index]} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle
          cx={CENTRE}
          cy={CENTRE}
          r={RING_RADIUS}
          fill="none"
          stroke={colors.border}
          strokeWidth={2}
          strokeDasharray={dashes.track}
          transform={rotate}
        />
        {dashes.done ? (
          <Circle
            cx={CENTRE}
            cy={CENTRE}
            r={RING_RADIUS}
            fill="none"
            stroke={`url(#${GRADIENT_ID})`}
            strokeWidth={3}
            strokeDasharray={dashes.done}
            transform={rotate}
          />
        ) : null}
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
