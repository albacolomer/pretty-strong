import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import type { GradientTextProps } from './GradientText';
import { Text } from './Text';

export type { GradientTextProps } from './GradientText';

// The web's GradientText: browsers paint text with a gradient themselves
// (CSS background-clip: text), so there's no mask view (which the web
// doesn't have). Same angle, colours and stops as the phone's.
export function GradientText({
  gradient = 'metalText',
  containerStyle,
  style,
  ...rest
}: GradientTextProps) {
  const { gradients } = useTheme();
  const { angle, colors, locations } = gradients[gradient];
  const stops = colors.map((color, index) => `${color} ${(locations[index] ?? 0) * 100}%`);
  // Not React Native styles: passed through to the page as they are.
  const paint = {
    backgroundImage: `linear-gradient(${angle}deg, ${stops.join(', ')})`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as object;

  return (
    <View style={containerStyle}>
      <Text {...rest} style={[style, styles.clear, paint]} />
    </View>
  );
}

const styles = StyleSheet.create({
  clear: {
    color: 'transparent',
  },
});
