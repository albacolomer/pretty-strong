import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import type { LayoutChangeEvent, ViewProps } from 'react-native';

import { cssGradientPoints, useTheme, type GradientName } from '@/theme';

export type GradientViewProps = ViewProps & {
  gradient: GradientName;
};

// A view filled with one of the theme's gradients, at its CSS angle. Where
// that angle starts and ends depends on the view's shape, so it measures
// itself first (top to bottom until then).
export function GradientView({ gradient, onLayout, ...rest }: GradientViewProps) {
  const { gradients } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { angle, colors, locations } = gradients[gradient];
  const { start, end } = cssGradientPoints(angle, size.width, size.height);

  function measure(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
    onLayout?.(event);
  }

  return (
    <LinearGradient
      {...rest}
      colors={colors}
      locations={locations}
      start={start}
      end={end}
      onLayout={measure}
    />
  );
}
