import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { LogPastWorkout } from '@/features/history/LogPastWorkout';

export default function LogPastWorkoutScreen() {
  const { t } = useTranslation();
  // The day, and the routine done (none: an empty workout).
  const { date, routineId } = useLocalSearchParams<{ date: string; routineId?: string }>();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('history.newTitle'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <LogPastWorkout date={date} routineId={routineId ?? null} onClose={() => router.back()} />
    </Screen>
  );
}
