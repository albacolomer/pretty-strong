import { Stack } from 'expo-router';

// A stack inside the tab, so routine, exercise and schedule screens can be
// pushed on top later.
export default function PlanLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
