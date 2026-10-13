import '@/lib/i18n';

import { Stack, ThemeProvider } from 'expo-router';
import { Appearance } from 'react-native';

import { useTheme } from '@/theme';
import { navigationThemes } from '@/theme/navigation';

// Dark by default, whatever the iPhone is set to. Runs before the first
// render, and also switches native parts (tab bar, keyboard, alerts) to dark.
Appearance.setColorScheme('dark');

export default function RootLayout() {
  const { scheme } = useTheme();

  return (
    <ThemeProvider value={navigationThemes[scheme]}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
