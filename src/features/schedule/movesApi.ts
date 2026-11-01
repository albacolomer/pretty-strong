import { supabase } from '@/lib/supabase';

import type { Move } from './moves';

// This week's changes (see schedule_overrides). RLS only returns and
// changes your own rows.

// The moves of routines planned between `from` and `to`, and of any moved
// into those days.
export async function fetchMoves(from: string, to: string): Promise<Move[]> {
  const { data, error } = await supabase
    .from('schedule_overrides')
    .select('routine_id, planned_date, moved_to, position')
    .or(
      `and(planned_date.gte.${from},planned_date.lte.${to}),and(moved_to.gte.${from},moved_to.lte.${to})`,
    )
    .order('created_at');
  if (error) throw error;
  return data.map((row) => ({
    routineId: row.routine_id,
    plannedDate: row.planned_date,
    movedTo: row.moved_to,
    position: row.position,
  }));
}

// Every move of routines planned between `from` and `to`, replaced in one
// transaction (see replace_schedule_overrides()): a whole shift at once,
// and "Desfés" puts the previous ones back exactly.
export async function replaceMoves(from: string, to: string, moves: readonly Move[]): Promise<void> {
  const { error } = await supabase.rpc('replace_schedule_overrides', {
    p_from: from,
    p_to: to,
    p_moves: moves
      .filter((move) => move.plannedDate >= from && move.plannedDate <= to)
      .map((move) => ({
        routine_id: move.routineId,
        planned_date: move.plannedDate,
        moved_to: move.movedTo,
        position: move.position,
      })),
  });
  if (error) throw error;
}
