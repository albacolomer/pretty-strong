import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing } from '@/theme';

import { LanguageSelector } from './LanguageSelector';
import { useUpdateLanguage } from './useUpdateLanguage';

// Language setting on the Profile tab; saved to the profile.
export function LanguagePicker() {
  const { t } = useTranslation();
  const updateLanguage = useUpdateLanguage();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color="textMuted">
        {t('profile.language')}
      </Text>
      <LanguageSelector onChange={(language) => updateLanguage.mutate(language)} />
      {updateLanguage.isError ? (
        <Text variant="caption" color="danger" role="alert">
          {t('profile.languageSaveError')}
        </Text>
      ) : null}
    </View>
  );
}
