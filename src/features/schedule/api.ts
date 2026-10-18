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
