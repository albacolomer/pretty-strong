import { authenticateAsync, getEnrolledLevelAsync, SecurityLevel } from 'expo-local-authentication';

// Face ID, or the phone's passcode when Face ID isn't there (in Expo Go,
// for one). Both prompts are iOS's own.

// Whether the phone has a passcode or Face ID set up at all.
export async function canAuthenticate(): Promise<boolean> {
  return (await getEnrolledLevelAsync()) !== SecurityLevel.NONE;
}

// Asks; true once it's you.
export async function authenticate(promptMessage: string, cancelLabel: string): Promise<boolean> {
  const result = await authenticateAsync({ promptMessage, cancelLabel });
  return result.success;
}
