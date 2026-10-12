import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export type CardProps = ViewProps & {
  // surface-raised background, e.g. for the active exercise card.
  raised?: boolean;
};

export function Card({ raised = false, style, ...rest }: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: raised ? colors.surfaceRaised : colors.surface },
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
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
