import { Stack } from 'expo-router';

// A stack inside the tab: a workout's details are pushed on top.
export default function HistoryLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
