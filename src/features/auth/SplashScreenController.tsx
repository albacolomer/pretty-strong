import { SplashScreen } from 'expo-router';

import { useAuth } from './AuthProvider';

// Keep the splash screen up until we know whether someone is signed in,
// so a signed-in user never sees the sign-in screen flash by.
SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
  const { isLoading } = useAuth();

  if (!isLoading) {
    SplashScreen.hide();
  }

  return null;
}
