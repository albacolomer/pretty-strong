import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui';
import { PastWorkoutView } from '@/features/history/PastWorkoutView';

export default function PastWorkoutScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  return (
    <Screen>
      <Stack.Screen
        options={{ headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal' }}
      />
      <PastWorkoutView id={sessionId} onDeleted={() => router.back()} />
    </Screen>
  );
}
