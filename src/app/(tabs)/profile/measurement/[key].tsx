import { Stack, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui';
import { parseMeasurementKey } from '@/features/body/body';
import { MeasurementDetail } from '@/features/body/MeasurementDetail';
import { useMeasurementName } from '@/features/body/useMeasurementName';

export default function MeasurementScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const nameOf = useMeasurementName();

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: nameOf(parseMeasurementKey(key)),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <MeasurementDetail measurementKey={key} />
    </Screen>
  );
}
