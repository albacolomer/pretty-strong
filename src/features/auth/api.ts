import { supabase } from '@/lib/supabase';

// These throw the Supabase error on failure; authErrorReason() explains it.
// On success there is nothing to return: AuthProvider receives the new
// session and the router switches screens.

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

// 'local' signs out this phone only, not every device.
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}
