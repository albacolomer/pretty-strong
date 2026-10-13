import { AuthApiError } from '@supabase/supabase-js';

import type { Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

// These throw the Supabase error on failure; authErrorReason() explains it.
// On success there is usually nothing to return: AuthProvider receives the
// new session and the router switches screens.

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

// Asks the database whether a (normalized) username is still free.
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', { candidate: username });
  if (error) throw error;
  return data;
}

type SignUpInput = { username: string; email: string; password: string; language: Language };

// The database trigger creates the profile from `username` and `language`.
// Returns true when Supabase wants the email confirmed before the first
// sign-in (no session yet). Confirmation is off for now, but this keeps
// the form honest if it is turned back on.
export async function signUp({ username, email, password, language }: SignUpInput): Promise<{
  needsEmailConfirmation: boolean;
}> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username, language } },
  });
  if (error) throw error;
  // With email confirmation on, Supabase hides that an email is already
  // registered: no error, just a fake user with no identities. Report it the
  // same way as when confirmation is off.
  if (data.user?.identities?.length === 0) {
    throw new AuthApiError('User already registered', 422, 'user_already_exists');
  }
  return { needsEmailConfirmation: data.session === null };
}

// 'local' signs out this phone only, not every device.
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
