import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SegmentedControl, Text } from '@/components/ui';
import { languages, useAppLanguage } from '@/lib/i18n';
import { spacing } from '@/theme';

import { useUpdateLanguage } from './useUpdateLanguage';

// Language setting on the Profile tab; saved to the profile.
export function LanguagePicker() {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const updateLanguage = useUpdateLanguage();

  const options = languages.map((option) => ({
    value: option,
    label: t(`languages.${option}`),
  }));

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="caption" color="textMuted">
        {t('profile.language')}
      </Text>
      <SegmentedControl
        label={t('profile.language')}
        options={options}
        value={language}
        onChange={(picked) => updateLanguage.mutate(picked)}
      />
      {updateLanguage.isError ? (
        <Text variant="caption" color="danger" role="alert">
          {t('profile.languageSaveError')}
        </Text>
      ) : null}
    </View>
  );
}
