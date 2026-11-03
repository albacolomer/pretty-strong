import { StyleSheet, View } from 'react-native';

import { useTheme, type GradientName } from '@/theme';

import { GradientView } from './GradientView';

// Brushed metal behind a button's content: the gradient, and over it the
// light on its top edge (an inset shadow, which the gradient would cover if
// it were on the button itself). It fills its parent, which gives the
// shape and the drop shadow; put it before the content. Steel unless said
// (gold on an event's day).
export function MetalFill({
  borderRadius,
  gradient = 'metal',
}: {
  borderRadius: number;
  gradient?: Extract<GradientName, 'metal' | 'gold'>;
}) {
  const { shadows } = useTheme();

  return (
    <>
      <GradientView gradient={gradient} style={[styles.fill, { borderRadius }]} />
      <View style={[styles.fill, { borderRadius, boxShadow: shadows.highlight }]} />
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
});
