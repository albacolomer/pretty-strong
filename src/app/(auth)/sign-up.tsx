import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Screen } from '@/components/ui';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { SignUpForm } from '@/features/auth/SignUpForm';

export default function SignUpScreen() {
  const { t } = useTranslation();

  return (
    <Screen centered>
      <AuthHeader subtitle={t('auth.signUp.title')} />
      <SignUpForm />
      <Button
        label={t('auth.signUp.haveAccount')}
        variant="ghost"
        // Goes back to sign-in if it's underneath, otherwise opens it.
        onPress={() => router.dismissTo('/sign-in')}
      />
    </Screen>
  );
}
