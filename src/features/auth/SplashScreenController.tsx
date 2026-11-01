import { SplashScreen } from 'expo-router';

import { useAuth } from './AuthProvider';

// Keep the splash screen up until we know whether someone is signed in,
// so a signed-in user never sees the sign-in screen flash by, and until
// the fonts are `ready`, so no text is drawn in the wrong one.
SplashScreen.preventAutoHideAsync();

export function SplashScreenController({ ready }: { ready: boolean }) {
  const { isLoading } = useAuth();

  if (!isLoading && ready) {
    SplashScreen.hide();
  }

  return null;
}
