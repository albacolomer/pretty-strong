import type { EventKind } from '@/features/events/events';
import type { Sport } from '@/features/schedule/sports';
import { supabase } from '@/lib/supabase';

import { toFinishPayload, type FinishedWorkout, type LastTime } from './activeWorkout';
import { liveDuration, type ChangeReason, type SessionStatus, type WorkoutSession } from './session';

const SESSION_COLUMNS =
  'id, date, planned_routine_id, routine_id, status, log_mode, started_at, ended_at, duration_s, notes, change_reason, planned_sport_id, sport, sport_name, planned_event_id, event_kind, event_name';

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
    startedAt: row.started_at,
    notes: row.notes,
    changeReason: row.change_reason as ChangeReason | null,
    plannedSportId: row.planned_sport_id,
    sport: row.sport as Sport | null,
    sportName: row.sport_name,
    plannedEventId: row.planned_event_id,
    eventKind: row.event_kind as EventKind | null,
    eventName: row.event_name,
  }));
}

// A quick log from Today: a planned routine, sport or event marked done,
// or skipped.
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
      planned_sport_id: session.plannedSportId,
      sport: session.sport,
      sport_name: session.sportName,
      planned_event_id: session.plannedEventId,
      event_kind: session.eventKind,
      event_name: session.eventName,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) throw error;
}

// Each exercise's sets the last time it was done, in this routine (when
// there is one) and anywhere: once, when a workout starts (see last_sets()).
// For a finished workout, `beforeSessionId` looks back from it instead.
export async function fetchLastTime(
  routineId: string | null,
  exerciseIds: string[],
  beforeSessionId?: string,
): Promise<Record<string, LastTime>> {
  const { data, error } = await supabase.rpc('last_sets', {
    // A null routine (an unplanned workout, or an exercise added in it)
    // only finds last time anywhere.
    p_routine_id: routineId as string,
    p_exercise_ids: exerciseIds,
    p_before_session_id: beforeSessionId,
  });
  if (error) throw error;

  const lastTime: Record<string, LastTime> = {};
  for (const row of data) {
    const entry = (lastTime[row.exercise_id] ??= { routine: [], any: [] });
    // Rows come in order, set by set; columns not used are null.
    const numbers = {
      weightKg: row.weight_kg ?? null,
      reps: row.reps ?? null,
      durationS: row.duration_s ?? null,
      distanceM: row.distance_m ?? null,
      speedKmh: row.speed_kmh ?? null,
      inclinePct: row.incline_pct ?? null,
      level: row.level ?? null,
    };
    if (row.scope !== 'routine') {
      entry.any.push(numbers);
      continue;
    }
    // In this routine, grouped by routine row.
    const routineExerciseId = row.routine_exercise_id ?? null;
    let routineRow = entry.routine.find((item) => item.routineExerciseId === routineExerciseId);
    if (!routineRow) {
      routineRow = { routineExerciseId, sets: [] };
      entry.routine.push(routineRow);
    }
    routineRow.sets.push(numbers);
  }
  return lastTime;
}

// A finished live workout, in one transaction (see finish_workout()).
// Sending the same one again replaces it, so retries are safe.
export async function finishWorkout(workout: FinishedWorkout): Promise<void> {
  const { error } = await supabase.rpc('finish_workout', {
    p_session: toFinishPayload(workout),
  });
  if (error) throw error;
}

// "Desa-la també a la rutina": a note written during a workout becomes the
// routine's note on that exercise, so the next workout of it shows it.
export async function saveNoteToRoutine(routineExerciseId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('routine_exercises')
    .update({ notes: notes.trim() === '' ? null : notes.trim() })
    .eq('id', routineExerciseId);
  if (error) throw error;
}

// "Desfés": the session goes, as if it was never logged.
export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
  if (error) throw error;
}
