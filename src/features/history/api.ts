import { EXERCISE_COLUMNS, toExercise } from '@/features/exercises/exercise';
import type { SetType } from '@/features/workout/activeWorkout';
import type { ChangeReason, Energy, ExerciseChangeReason } from '@/features/workout/session';
import { liveDuration } from '@/features/workout/session';
import { supabase } from '@/lib/supabase';

import { toSavePayload, type HistoryEntry, type PastWorkout } from './pastWorkout';

// How many workouts the list loads at a time.
export const HISTORY_PAGE_SIZE = 30;

// One page of finished workouts, newest first (skipped days aren't
// workouts). Counts come from the database, nothing is stored (data
// rule 2). RLS only returns your own.
export async function fetchHistoryPage(page: number): Promise<HistoryEntry[]> {
  const from = page * HISTORY_PAGE_SIZE;
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      'id, date, log_mode, started_at, ended_at, duration_s, routine:routines!workout_sessions_routine_id_fkey(name), session_exercises(sets(count))',
    )
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE - 1);
  if (error) throw error;

  return data.map((row) => {
    const counts = row.session_exercises.map((exercise) => exercise.sets[0]?.count ?? 0);
    return {
      id: row.id,
      date: row.date,
      routineName: row.routine?.name ?? null,
      logMode: row.log_mode as HistoryEntry['logMode'],
      durationS: row.duration_s ?? liveDuration(row.started_at, row.ended_at),
      exercises: counts.filter((count) => count > 0).length,
      sets: counts.reduce((total, count) => total + count, 0),
    };
  });
}

const SET_COLUMNS =
  'id, position, set_type, weight_kg, reps, duration_s, distance_m, speed_kmh, incline_pct, level, rpe, completed_at';

// One workout with its exercises and sets, in order. Null if it's gone.
export async function fetchPastWorkout(id: string): Promise<PastWorkout | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      `id, date, planned_routine_id, routine_id, change_reason, log_mode, started_at, ended_at, duration_s, energy, notes,
      routine:routines!workout_sessions_routine_id_fkey(name),
      session_exercises(id, exercise_id, routine_exercise_id, position, group_key, rest_s, change, change_reason, notes,
        exercise:exercises!session_exercises_exercise_id_fkey(${EXERCISE_COLUMNS}),
        replaced:exercises!session_exercises_swapped_from_id_fkey(${EXERCISE_COLUMNS}),
        sets(${SET_COLUMNS}))`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    date: data.date,
    plannedRoutineId: data.planned_routine_id,
    routineId: data.routine_id,
    routineName: data.routine?.name ?? null,
    // The database's check constraints guarantee the codes.
    changeReason: data.change_reason as ChangeReason | null,
    logMode: data.log_mode as PastWorkout['logMode'],
    startedAt: data.started_at,
    endedAt: data.ended_at,
    durationS: data.duration_s,
    energy: data.energy as Energy | null,
    notes: data.notes,
    exercises: [...data.session_exercises]
      .sort((a, b) => a.position - b.position)
      .map((row) => ({
        id: row.id,
        exerciseId: row.exercise_id,
        exercise: toExercise(row.exercise),
        replaced: row.replaced ? toExercise(row.replaced) : null,
        routineExerciseId: row.routine_exercise_id,
        groupKey: row.group_key,
        restS: row.rest_s,
        change: row.change as PastWorkout['exercises'][number]['change'],
        changeReason: row.change_reason as ExerciseChangeReason | null,
        notes: row.notes,
        sets: [...row.sets]
          .sort((a, b) => a.position - b.position)
          .map((set) => ({
            id: set.id,
            setType: set.set_type as SetType,
            numbers: {
              weightKg: set.weight_kg,
              reps: set.reps,
              durationS: set.duration_s,
              distanceM: set.distance_m,
              speedKmh: set.speed_kmh,
              inclinePct: set.incline_pct,
              level: set.level,
            },
            rpe: set.rpe,
            completedAt: set.completed_at,
          })),
      })),
  };
}

// Saves a whole workout in one transaction (see finish_workout()): after
// an edit, or to put a deleted one back. Same ids, so it replaces.
export async function saveWorkout(workout: PastWorkout): Promise<void> {
  const { error } = await supabase.rpc('finish_workout', { p_session: toSavePayload(workout) });
  if (error) throw error;
}
