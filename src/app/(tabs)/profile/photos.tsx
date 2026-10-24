import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { PhotoCompare } from '@/features/body/PhotoCompare';

export default function ComparePhotosScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('photos.compare'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <PhotoCompare />
    </Screen>
  );
}
