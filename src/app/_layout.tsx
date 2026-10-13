import '@/lib/i18n';

import { Stack, ThemeProvider } from 'expo-router';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { SplashScreenController } from '@/features/auth/SplashScreenController';
import { useTheme } from '@/theme';
import { navigationThemes } from '@/theme/navigation';

export default function RootLayout() {
  const { scheme } = useTheme();

  return (
    <AuthProvider>
      <SplashScreenController />
      <ThemeProvider value={navigationThemes[scheme]}>
        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}

// Signed in: only the tabs exist. Signed out: only the auth screens exist.
// When the session changes, the router moves to the group that is allowed.
function RootNavigator() {
  const { session } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
