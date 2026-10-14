import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Screen } from '@/components/ui';
import { AuthHeader } from '@/features/auth/AuthHeader';
import { SignInForm } from '@/features/auth/SignInForm';
import { LanguageSelector } from '@/features/profile/LanguageSelector';
import { setAppLanguage } from '@/lib/i18n';

export default function SignInScreen() {
  const { t } = useTranslation();

  return (
    <Screen centered>
      <AuthHeader subtitle={t('auth.signIn.title')} />
      <SignInForm />
      <Button
        label={t('auth.signIn.noAccount')}
        variant="ghost"
        onPress={() => router.push('/sign-up')}
      />
      {/* Only switches the app; once signed in, the profile's language wins. */}
      <LanguageSelector onChange={setAppLanguage} />
    </Screen>
  );
}
