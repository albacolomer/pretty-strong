import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AuthScreen, AuthSwitch } from '@/features/auth/AuthScreen';
import { SignUpForm } from '@/features/auth/SignUpForm';

export default function SignUpScreen() {
  const { t } = useTranslation();

  return (
    <AuthScreen
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      footer={
        <AuthSwitch
          question={t('auth.signUp.haveAccount')}
          action={t('auth.signUp.signIn')}
          // Goes back to sign-in if it's underneath, otherwise opens it.
          onPress={() => router.dismissTo('/sign-in')}
        />
      }>
      <SignUpForm />
    </AuthScreen>
  );
}
