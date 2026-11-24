import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { spacing } from '@/theme';

import { signOut } from './api';
import { authErrorReason, type AuthErrorReason } from './authErrors';

// Settings → "Tanca la sessió", on its own at the bottom: a white pill with
// a red label, apart from the settings so it's easy to find and never
// tapped by mistake. On success the router swaps the tabs for sign-in.
export function SignOutButton() {
  const { t } = useTranslation();
  const [error, setError] = useState<AuthErrorReason | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handlePress() {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (signOutError) {
      setError(authErrorReason(signOutError));
      setIsSigningOut(false);
    }
  }

  return (
    <View style={styles.signOut}>
      <Button
        label={t('auth.signOut')}
        icon="rectangle.portrait.and.arrow.right"
        variant="danger"
        onPress={() => void handlePress()}
        disabled={isSigningOut}
      />
      {error ? (
        <Text variant="caption" color="danger" role="alert" style={styles.error}>
          {t(`auth.errors.${error}`)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  signOut: {
    gap: spacing.sm,
  },
  error: {
    textAlign: 'center',
  },
});
