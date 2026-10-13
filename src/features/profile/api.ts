import type { Language } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;

// RLS only returns the signed-in user's own row.
export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

// Returns the updated row, so the cached profile can be replaced with it.
export async function updateProfileLanguage(userId: string, language: Language): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ language })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
