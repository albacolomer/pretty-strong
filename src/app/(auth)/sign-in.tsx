import { useTranslation } from 'react-i18next';

import { Screen, Text } from '@/components/ui';
import { SignInForm } from '@/features/auth/SignInForm';

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('auth.signIn.title')}>
      <Text color="textMuted">{t('auth.signIn.subtitle')}</Text>
      <SignInForm />
    </Screen>
  );
}
