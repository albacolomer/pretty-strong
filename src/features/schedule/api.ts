import type { Weekday } from '@/features/routines/routine';
import { supabase } from '@/lib/supabase';

export type DayEntry = {
  routineId: string;
  weekday: Weekday;
  // Its place on the day, among the day's other routines.
  position: number;
};

// Plans a routine on a day (US-09). A second tap that arrives twice does
// nothing: the routine is already there.
export async function addToDay(entry: DayEntry, userId: string): Promise<void> {
  const { error } = await supabase.from('weekly_schedule').upsert(
    {
      routine_id: entry.routineId,
      weekday: entry.weekday,
      position: entry.position,
      user_id: userId,
    },
    { onConflict: 'routine_id,weekday', ignoreDuplicates: true },
  );
  if (error) throw error;
}

// Takes a routine off a day; the routine itself stays.
export async function removeFromDay(routineId: string, weekday: Weekday): Promise<void> {
  const { error } = await supabase
    .from('weekly_schedule')
    .delete()
    .eq('routine_id', routineId)
    .eq('weekday', weekday);
  if (error) throw error;
}

// A routine dragged (or moved from its menu) to another day of the usual
// week, at `position` there. One update of its row, so it's never on both
// days or neither; the routine can't already be on `to` (the key is
// routine and day).
export type DayMove = { routineId: string; from: Weekday; to: Weekday; position: number };

export async function moveToDay(move: DayMove): Promise<void> {
  const { error } = await supabase
    .from('weekly_schedule')
    .update({ weekday: move.to, position: move.position })
    .eq('routine_id', move.routineId)
    .eq('weekday', move.from);
  if (error) throw error;
}
