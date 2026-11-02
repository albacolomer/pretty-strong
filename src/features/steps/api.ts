import { supabase } from '@/lib/supabase';

import type { DailySteps } from './stepHistory';

// The steps saved for the calendar (see daily_steps). RLS only returns and
// changes your own rows.

// Each day's steps between `from` and `to`, by "2026-10-20".
export async function fetchDailySteps(from: string, to: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('daily_steps')
    .select('date, steps')
    .gte('date', from)
    .lte('date', to);
  if (error) throw error;
  return new Map(data.map((row) => [row.date, row.steps]));
}

// The phone's counts, saved at once; a day only changes when its count is
// higher than the one saved (see save_daily_steps()).
export async function saveDailySteps(days: DailySteps[]): Promise<void> {
  const { error } = await supabase.rpc('save_daily_steps', { p_days: days });
  if (error) throw error;
}
