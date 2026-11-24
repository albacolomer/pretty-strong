import { supabase } from '@/lib/supabase';

import type { Addition } from './additions';
import type { Sport } from './sports';

// What's added to single weeks (see schedule_additions). RLS only returns
// and changes your own rows.

// The additions dated from `from` to `to`, both included.
export async function fetchAdditions(from: string, to: string): Promise<Addition[]> {
  const { data, error } = await supabase
    .from('schedule_additions')
    .select('id, date, routine_id, sport, custom_name, start_time, duration_s, position')
    .gte('date', from)
    .lte('date', to)
    .order('created_at');
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    date: row.date,
    routineId: row.routine_id,
    // The check constraint guarantees the codes.
    sport: row.sport as Sport | null,
    customName: row.custom_name,
    // "19:00:00" → "19:00".
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    durationS: row.duration_s,
    position: row.position,
  }));
}

// Every addition dated from `from` to `to`, replaced in one transaction
// (see replace_schedule_additions()): "Torna a l'habitual" clears them, a
// shift moves several at once, and "Desfés" puts the previous ones back.
export async function replaceAdditions(
  from: string,
  to: string,
  additions: readonly Addition[],
): Promise<void> {
  const { error } = await supabase.rpc('replace_schedule_additions', {
    p_from: from,
    p_to: to,
    p_additions: additions
      .filter((addition) => addition.date >= from && addition.date <= to)
      .map((addition) => ({
        id: addition.id,
        date: addition.date,
        routine_id: addition.routineId,
        sport: addition.sport,
        custom_name: addition.customName,
        start_time: addition.startTime,
        duration_s: addition.durationS,
        position: addition.position,
      })),
  });
  if (error) throw error;
}
