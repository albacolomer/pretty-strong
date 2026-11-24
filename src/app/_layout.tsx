import '@/lib/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, ThemeProvider } from 'expo-router';

import { MenuHost, ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { SplashScreenController } from '@/features/auth/SplashScreenController';
import { useNeedsSetup } from '@/features/onboarding/setupStore';
import { useAppFonts } from '@/lib/fonts';
import { configureNotifications } from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { useTheme } from '@/theme';
import { navigationThemes } from '@/theme/navigation';

// Once, when the app starts: rest alerts don't pop up over the workout.
configureNotifications();

export default function RootLayout() {
  const { scheme } = useTheme();
  // Text measured before its font is loaded keeps the wrong size, so the
  // screens wait for the fonts (behind the splash screen). The session is
  // checked meanwhile.
  const fontsReady = useAppFonts();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SplashScreenController ready={fontsReady} />
        {fontsReady ? (
          <ThemeProvider value={navigationThemes[scheme]}>
            <ToastProvider>
              <RootNavigator />
              {/* Menus on the app's own layer (sheets and the workout have theirs). */}
              <MenuHost />
            </ToastProvider>
          </ThemeProvider>
        ) : null}
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Signed in: only the tabs exist, or, just after signing up, only the
// setup. Signed out: only the auth screens exist. When the session changes,
// the router moves to the group that is allowed. redirectTo names the
// screen: left to itself the router would go to "/(auth)", which has no
// index screen, and show "Unmatched route".
function RootNavigator() {
  const { session } = useAuth();
  const needsSetup = useNeedsSetup(session);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected
        guard={!!session && !needsSetup}
        redirectTo={session ? '/onboarding' : '/sign-in'}>
        <Stack.Screen name="(tabs)" />
        {/* Over the tabs, so nothing outside it is tapped by accident mid-set. */}
        <Stack.Screen
          name="workout"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack.Protected>
      <Stack.Protected guard={needsSetup} redirectTo={session ? '/' : '/sign-in'}>
        {/* Its own ‹ goes back a step; a swipe would leave the setup. */}
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
