import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MenuHost } from '@/components/ui';
import { ActiveWorkoutView } from '@/features/workout/ActiveWorkoutView';

// The active workout, a full-screen modal over the tabs (spec: Navigation
// structure). Logic lives in src/features/workout.
export default function WorkoutScreen() {
  return (
    <View style={styles.screen}>
      <ActiveWorkoutView onClose={() => router.back()} />
      {/* It's shown over the app, so its menus need their own place. */}
      <MenuHost />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
