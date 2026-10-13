import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Text } from '@/components/ui';

import { signOut } from './api';
import { authErrorReason, type AuthErrorReason } from './authErrors';

export function SignOutButton() {
  const { t } = useTranslation();
  const [error, setError] = useState<AuthErrorReason | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handlePress() {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      // On success the router swaps the tabs for the sign-in screen.
    } catch (signOutError) {
      setError(authErrorReason(signOutError));
      setIsSigningOut(false);
    }
  }

  return (
    <>
      {error ? (
        <Text color="danger" role="alert">
          {t(`auth.errors.${error}`)}
        </Text>
      ) : null}
      <Button
        label={t('auth.signOut')}
        variant="secondary"
        onPress={handlePress}
        disabled={isSigningOut}
      />
    </>
  );
}
