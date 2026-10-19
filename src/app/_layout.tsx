import '@/lib/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, ThemeProvider } from 'expo-router';

import { ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { SplashScreenController } from '@/features/auth/SplashScreenController';
import { configureNotifications } from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/theme';
import { navigationThemes } from '@/theme/navigation';

// Once, when the app starts: rest alerts don't pop up over the workout.
configureNotifications();

export default function RootLayout() {
  const { scheme } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SplashScreenController />
        <ThemeProvider value={navigationThemes[scheme]}>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
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
        {/* Over the tabs, so nothing outside it is tapped by accident mid-set. */}
        <Stack.Screen
          name="workout"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
