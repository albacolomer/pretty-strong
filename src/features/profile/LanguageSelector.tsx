import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui';
import { languages, useAppLanguage, type Language } from '@/lib/i18n';

// Català · Español · English, showing the current app language. What a pick
// does is up to the screen: Profile saves it to the profile, the sign-in
// and sign-up screens only switch the app.
export function LanguageSelector({ onChange }: { onChange: (language: Language) => void }) {
  const { t } = useTranslation();
  const language = useAppLanguage();

  const options = languages.map((option) => ({
    value: option,
    label: t(`languages.${option}`),
  }));

  return (
    <SegmentedControl
      label={t('profile.language')}
      options={options}
      value={language}
      onChange={onChange}
    />
  );
}
