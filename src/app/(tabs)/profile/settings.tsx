import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { Credits } from '@/features/profile/Credits';
import { LanguagePicker } from '@/features/profile/LanguagePicker';
import { ProfileSummary } from '@/features/profile/ProfileSummary';

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
      <ProfileSummary />
      <LanguagePicker />
      <SignOutButton />
      <Credits />
    </Screen>
  );
}
