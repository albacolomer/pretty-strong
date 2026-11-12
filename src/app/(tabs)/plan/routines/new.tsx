import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { WEEKDAYS, type Weekday } from '@/features/routines/routine';
import { RoutineEditor } from '@/features/routines/RoutineEditor';

export default function NewRoutineScreen() {
  const { t } = useTranslation();
  // From Avui's "+" (`start`): once saved, train with it. From Canvia
  // (`swapFor`, the planned routine): once saved, swap it in for that one.
  // From Setmana's "+ Afegeix" (`weekday`, 1–7): planned on that day.
  const { start, swapFor, weekday } = useLocalSearchParams<{
    start?: string;
    swapFor?: string;
    weekday?: string;
  }>();
  const day = WEEKDAYS.find((other) => String(other) === weekday);
  const initialWeekdays: Weekday[] | undefined = day ? [day] : undefined;

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
        initialWeekdays={initialWeekdays}
        onSaved={(routineId) => {
          router.back();
          if (start) router.navigate({ pathname: '/', params: { start: routineId } });
          if (swapFor) router.navigate({ pathname: '/', params: { swap: routineId, swapFor } });
        }}
      />
    </Screen>
  );
}
