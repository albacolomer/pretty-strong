import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing } from '@/theme';

// Credits at the bottom of Profile. RepDB's licence asks for the exact
// line "Exercise data by RepDB (repdb.co)", so it isn't translated.
export function Credits() {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" color="textMuted">
        {t('profile.credits')}
      </Text>
      <Text variant="caption" color="textMuted">
        {t('profile.repdbCredit')}
      </Text>
    </View>
  );
}
