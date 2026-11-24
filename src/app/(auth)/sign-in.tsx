import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen, AuthSwitch } from '@/features/auth/AuthScreen';
import { SignInForm } from '@/features/auth/SignInForm';

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <AuthScreen
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
      footer={
        <AuthSwitch
          question={t('auth.signIn.noAccount')}
          action={t('auth.signIn.createAccount')}
          onPress={() => router.push('/sign-up')}
        />
      }>
      <SignInForm />
    </AuthScreen>
  );
}
