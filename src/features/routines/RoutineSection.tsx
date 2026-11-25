import { StyleSheet, View } from 'react-native';

import { Button, Card, Text, Icon, type IconName } from '@/components/ui';
import { gaps, radius, spacing, useTheme } from '@/theme';

type EmptySectionCardProps = {
  icon: IconName;
  title: string;
  hint: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
};

// What an empty section shows: an icon, what's missing, and the button
// to add the first one.
export function EmptySectionCard({
  icon,
  title,
  hint,
  actionLabel,
  onAction,
  actionDisabled = false,
}: EmptySectionCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.empty}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <Icon name={icon} size={24} weight="medium" tintColor={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong" style={styles.centered}>
          {title}
        </Text>
        <Text variant="caption" color="textMuted" style={styles.centered}>
          {hint}
        </Text>
      </View>
      <Button
        label={actionLabel}
        icon="plus"
        caps
        onPress={onAction}
        disabled={actionDisabled}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xl,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    alignItems: 'center',
    gap: gaps.tight,
  },
  centered: {
    textAlign: 'center',
  },
});
