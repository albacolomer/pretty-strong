import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LanguageButton } from '@/features/auth/LanguageButton';

// Sign-in and sign-up, with the language button over both, in the corner.
export default function AuthLayout() {
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack>
      <LanguageButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
