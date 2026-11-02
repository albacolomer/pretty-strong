import { Stack } from 'expo-router';

// Profile's own page sits under anything opened from another tab (Avui
// opens a workout with withAnchor), so its back button leads somewhere.
export const unstable_settings = {
  anchor: 'index',
};

// A stack inside the tab: settings, editing the profile, and your history
// (a workout, editing it, logging one afterwards) are pushed on top.
export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
