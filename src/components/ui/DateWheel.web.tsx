import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { DateField } from './DateField';
import type { DateWheelProps } from './DateWheel';

export type { DateWheelProps } from './DateWheel';

// The web has no wheels to put in a sheet: the date pill, centred, opens
// the iPhone's own picker (wheels in Safari) when tapped.
export function DateWheel(props: DateWheelProps) {
  return (
    <View style={styles.centre}>
      <DateField {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  centre: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
