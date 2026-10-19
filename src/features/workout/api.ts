import { supabase } from '@/lib/supabase';

import { toFinishPayload, type FinishedWorkout } from './activeWorkout';
import { liveDuration, type ChangeReason, type SessionStatus, type WorkoutSession } from './session';

const SESSION_COLUMNS =
  'id, date, planned_routine_id, routine_id, status, log_mode, started_at, ended_at, duration_s, notes, change_reason';

// Your sessions from `from` to `to` (both "2026-10-20" dates, included),
// oldest first. RLS only returns your own.
export async function fetchSessions(from: string, to: string): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(SESSION_COLUMNS)
    .gte('date', from)
    .lte('date', to)
    .order('created_at');
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    date: row.date,
    plannedRoutineId: row.planned_routine_id,
    routineId: row.routine_id,
    // The database's check constraints guarantee the codes.
    status: row.status as SessionStatus,
    logMode: row.log_mode as WorkoutSession['logMode'],
    durationS: row.duration_s ?? liveDuration(row.started_at, row.ended_at),
    notes: row.notes,
    changeReason: row.change_reason as ChangeReason | null,
  }));
}

// A quick log from Today: a planned routine marked done, or a skipped day.
// The id is made on the phone, so saving it twice (a retry) keeps one.
export async function logQuickSession(session: WorkoutSession): Promise<void> {
  const { error } = await supabase.from('workout_sessions').upsert(
    {
      id: session.id,
      date: session.date,
      planned_routine_id: session.plannedRoutineId,
      routine_id: session.routineId,
      status: session.status,
      log_mode: 'quick',
      duration_s: session.durationS,
      notes: session.notes,
      change_reason: session.changeReason,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

// A finished live workout, in one transaction (see finish_workout()).
// Sending the same one again replaces it, so retries are safe.
export async function finishWorkout(workout: FinishedWorkout): Promise<void> {
  const { error } = await supabase.rpc('finish_workout', {
    p_session: toFinishPayload(workout),
  });
  if (error) throw error;
}

// "Desfés": the session goes, as if it was never logged.
export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
  if (error) throw error;
}
