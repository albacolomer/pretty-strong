import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { WeightHistory } from '@/features/body/WeightHistory';

export default function WeightHistoryScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('body.weight'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <WeightHistory />
    </Screen>
  );
}
