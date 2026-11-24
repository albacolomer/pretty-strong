import { supabase } from '@/lib/supabase';

import type { SportDrop } from './additions';

// The usual week's sports taken off single dates (see
// schedule_sport_drops). RLS only returns and changes your own rows.

// The drops dated from `from` to `to`, both included.
export async function fetchSportDrops(from: string, to: string): Promise<SportDrop[]> {
  const { data, error } = await supabase
    .from('schedule_sport_drops')
    .select('weekly_sport_id, date')
    .gte('date', from)
    .lte('date', to)
    .order('created_at');
  if (error) throw error;
  return data.map((row) => ({ sportId: row.weekly_sport_id, date: row.date }));
}

// Every drop dated from `from` to `to`, replaced in one transaction (see
// replace_sport_drops()), so "Desfés" puts the previous ones back exactly.
export async function replaceSportDrops(
  from: string,
  to: string,
  drops: readonly SportDrop[],
): Promise<void> {
  const { error } = await supabase.rpc('replace_sport_drops', {
    p_from: from,
    p_to: to,
    p_drops: drops
      .filter((drop) => drop.date >= from && drop.date <= to)
      .map((drop) => ({ weekly_sport_id: drop.sportId, date: drop.date })),
  });
  if (error) throw error;
}
