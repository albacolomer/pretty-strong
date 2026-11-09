import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { ExerciseDetail } from '@/features/exercises/ExerciseDetail';

export default function ExerciseDetailScreen() {
  const { t } = useTranslation();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('exercises.detail.title'),
          // Just the arrow: the previous screen has no title to show.
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ExerciseDetail
        exerciseId={id}
        onEdit={() => router.push({ pathname: '/plan/exercises/[id]/edit', params: { id } })}
        // A routine being edited may have this exercise in it.
        onRemoved={from === 'routine' ? undefined : () => router.back()}
      />
    </Screen>
  );
}
