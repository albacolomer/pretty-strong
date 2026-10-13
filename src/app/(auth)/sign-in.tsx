import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { SignInForm } from '@/features/auth/SignInForm';

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <Screen centered>
      <AuthHeader subtitle={t('auth.signIn.title')} />
      <SignInForm />
    </Screen>
  );
}
