import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { Settings } from '@/features/profile/Settings';

export default function SettingsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('settings.title'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <Settings />
    </Screen>
  );
}
