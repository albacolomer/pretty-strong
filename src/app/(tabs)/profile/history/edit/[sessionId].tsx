import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { EditPastWorkout } from '@/features/history/EditPastWorkout';

export default function EditPastWorkoutScreen() {
  const { t } = useTranslation();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('history.editTitle'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <EditPastWorkout id={sessionId} onClose={() => router.back()} />
    </Screen>
  );
}
