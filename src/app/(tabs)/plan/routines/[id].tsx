import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { RoutineEditor } from '@/features/routines/RoutineEditor';

export default function RoutineScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('routines.editor.editTitle'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <RoutineEditor routineId={id} onSaved={() => router.back()} />
    </Screen>
  );
}
