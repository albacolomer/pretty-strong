import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { EditProfile } from '@/features/profile/EditProfile';

export default function EditProfileScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('profile.edit'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <EditProfile onClose={() => router.back()} />
    </Screen>
  );
}
