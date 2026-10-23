import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { AllWorkouts } from '@/features/history/AllWorkouts';

export default function AllWorkoutsScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('history.allTitle'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <AllWorkouts />
    </Screen>
  );
}
