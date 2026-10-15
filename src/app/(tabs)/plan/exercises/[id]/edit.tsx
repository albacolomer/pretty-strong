import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { EditExercise } from '@/features/exercises/EditExercise';

export default function EditExerciseScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('exercises.form.editTitle'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <EditExercise exerciseId={id} onSaved={() => router.back()} />
    </Screen>
  );
}
