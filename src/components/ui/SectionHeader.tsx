import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Text } from './Text';

// A section's heading in small capitals over its card, with an optional
// count on the right: "EXERCICIS · 3 afegits".
export function SectionHeader({ title, count }: { title: string; count?: string }) {
  return (
    <View style={styles.header}>
      <Text variant="label" color="textMuted" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {count ? (
        <Text variant="caption" color="textMuted">
          {count}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  title: {
    flex: 1,
  },
});
