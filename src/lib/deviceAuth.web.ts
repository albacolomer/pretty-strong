import { askForPassword } from '@/features/auth/passwordCheck';

// The web has no Face ID or passcode prompt: the account's password stands
// in for them (spec: "Web app").

// Every account has a password, so photos can always be hidden.
export async function canAuthenticate(): Promise<boolean> {
  return true;
}

// Asks for the password in a sheet; true once it's right.
export function authenticate(promptMessage: string, cancelLabel: string): Promise<boolean> {
  return askForPassword(promptMessage, cancelLabel);
}
