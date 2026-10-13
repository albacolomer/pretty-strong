import { Stack } from 'expo-router';

// A stack inside the tab, so workout details can be pushed on top later.
export default function HistoryLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
