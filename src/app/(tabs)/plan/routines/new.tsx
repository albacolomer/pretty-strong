import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { RoutineEditor } from '@/features/routines/RoutineEditor';

export default function NewRoutineScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('routines.editor.newTitle'),
          // Just the arrow: the previous screen has no title to show.
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <RoutineEditor routineId={null} onSaved={() => router.back()} />
    </Screen>
  );
}
