import { Stack } from 'expo-router';

// A stack inside the tab: settings, editing the profile, and your history
// (a workout, editing it, logging one afterwards) are pushed on top.
export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
