import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsRow } from '@/components/ui';

import { signOut } from './api';
import { authErrorReason } from './authErrors';

// Settings → Compte → "Tanca la sessió", a row for a SettingsCard. On
// success the router swaps the tabs for the sign-in screen; a failure
// shows under the row.
export function SignOutRow() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handlePress() {
    if (isSigningOut) return;
    setError(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (signOutError) {
      setError(t(`auth.errors.${authErrorReason(signOutError)}`));
      setIsSigningOut(false);
    }
  }

  return (
    <SettingsRow
      icon="rectangle.portrait.and.arrow.right"
      tone="muted"
      label={t('auth.signOut')}
      error={error ?? undefined}
      chevron={false}
      onPress={() => void handlePress()}
    />
  );
}
