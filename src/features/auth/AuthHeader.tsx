import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { GradientText, Logo, Text } from '@/components/ui';
import { spacing } from '@/theme';

// Logo, app name and a one-line subtitle, shared by sign-in and sign-up.
export function AuthHeader({ subtitle }: { subtitle: string }) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <Logo width={120} />
      <GradientText variant="screenTitle" accessibilityRole="header" style={styles.name}>
        {t('app.name')}
      </GradientText>
      <Text color="textMuted" style={styles.text}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  text: {
    textAlign: 'center',
  },
  // Italic capitals lean past their box; this keeps the last one's tip
  // inside the gradient.
  name: {
    textAlign: 'center',
    paddingRight: 4,
  },
});
