import { router } from 'expo-router';

import { ActiveWorkoutView } from '@/features/workout/ActiveWorkoutView';

// The active workout, a full-screen modal over the tabs (spec: Navigation
// structure). Logic lives in src/features/workout.
export default function WorkoutScreen() {
  return <ActiveWorkoutView onClose={() => router.back()} />;
}
