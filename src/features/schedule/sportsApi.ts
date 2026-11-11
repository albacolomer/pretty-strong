import type { Weekday } from '@/features/routines/routine';
import { supabase } from '@/lib/supabase';

import type { Sport, WeeklySport } from './sports';

// RLS only returns and changes your own rows.

export async function fetchWeeklySports(): Promise<WeeklySport[]> {
  const { data, error } = await supabase
    .from('weekly_sports')
    .select('id, weekday, sport, custom_name, start_time, duration_s, position')
    .order('created_at');
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    // The check constraints guarantee these.
    weekday: row.weekday as Weekday,
    sport: row.sport as Sport,
    customName: row.custom_name,
    // "19:00:00" → "19:00".
    startTime: row.start_time ? row.start_time.slice(0, 5) : null,
    durationS: row.duration_s,
    position: row.position,
  }));
}

// Plans a sport on a day. The id is made on the phone, so "Desfés" after
// taking it off puts back the very same one.
export async function addWeeklySport(sport: WeeklySport): Promise<void> {
  const { error } = await supabase.from('weekly_sports').upsert({
    id: sport.id,
    weekday: sport.weekday,
    sport: sport.sport,
    custom_name: sport.customName,
    start_time: sport.startTime,
    duration_s: sport.durationS,
    position: sport.position,
  });
  if (error) throw error;
}

export async function updateWeeklySport(
  id: string,
  change: Pick<WeeklySport, 'startTime' | 'durationS'>,
): Promise<void> {
  const { error } = await supabase
    .from('weekly_sports')
    .update({ start_time: change.startTime, duration_s: change.durationS })
    .eq('id', id);
  if (error) throw error;
}

// A sport dragged (or moved from its menu) to another day, at `position`.
export async function moveWeeklySport(
  id: string,
  weekday: Weekday,
  position: number,
): Promise<void> {
  const { error } = await supabase
    .from('weekly_sports')
    .update({ weekday, position })
    .eq('id', id);
  if (error) throw error;
}

export async function removeWeeklySport(id: string): Promise<void> {
  const { error } = await supabase.from('weekly_sports').delete().eq('id', id);
  if (error) throw error;
}

// A day's new order after a drag, routines and sports together, in one
// transaction (see reorder_day()).
export async function reorderDay(
  weekday: Weekday,
  items: readonly { kind: 'routine' | 'sport'; id: string }[],
): Promise<void> {
  const { error } = await supabase.rpc('reorder_day', { p_weekday: weekday, p_items: [...items] });
  if (error) throw error;
}
