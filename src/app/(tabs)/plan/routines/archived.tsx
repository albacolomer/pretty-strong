import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { ArchivedRoutines } from '@/features/routines/ArchivedRoutines';

export default function ArchivedRoutinesScreen() {
  const { t } = useTranslation();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('routines.archivedTitle'),
          // Just the arrow: the previous screen has no title to show.
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ArchivedRoutines />
    </Screen>
  );
}
