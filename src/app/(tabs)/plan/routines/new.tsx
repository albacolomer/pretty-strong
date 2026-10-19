import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { RoutineEditor } from '@/features/routines/RoutineEditor';

export default function NewRoutineScreen() {
  const { t } = useTranslation();
  // From Today's "Fes una altra rutina": once saved, train with it.
  const { start } = useLocalSearchParams<{ start?: string }>();

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
      <RoutineEditor
        routineId={null}
        onSaved={(routineId) => {
          router.back();
          if (start) router.navigate({ pathname: '/', params: { start: routineId } });
        }}
      />
    </Screen>
  );
}
