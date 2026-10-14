import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { ExerciseForm } from '@/features/exercises/ExerciseForm';

export default function NewExerciseScreen() {
  const { t } = useTranslation();
  // From "Crea «…»" on an empty search.
  const { name } = useLocalSearchParams<{ name?: string }>();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('exercises.form.title'),
          // Just the arrow: the previous screen has no title to show.
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ExerciseForm initialName={name ?? ''} onCreated={() => router.back()} />
    </Screen>
  );
}
