import { StyleSheet, View, type ViewProps } from 'react-native';

import { inset, radius, spacing, useTheme } from '@/theme';

export type CardProps = ViewProps & {
  // surface-raised background, e.g. for the active exercise card.
  raised?: boolean;
};

// A white panel lifted off the page by a soft two-layer shadow.
export function Card({ raised = false, style, ...rest }: CardProps) {
  const { colors, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: raised ? colors.surfaceRaised : colors.surface,
          boxShadow: shadows.card,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    // iOS-style smooth corners instead of plain circular arcs.
    borderCurve: 'continuous',
    paddingHorizontal: inset.cardX,
    paddingVertical: inset.cardY,
    gap: spacing.sm,
  },
});
