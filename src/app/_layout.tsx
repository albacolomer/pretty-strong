import '@/lib/i18n';

import { Stack, ThemeProvider } from 'expo-router';

import { useTheme } from '@/theme';
import { navigationThemes } from '@/theme/navigation';

export default function RootLayout() {
  const { scheme } = useTheme();

  return (
    <ThemeProvider value={navigationThemes[scheme]}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
