import { EXERCISE_COLUMNS, toExercise } from '@/features/exercises/exercise';
import type { RoutineLabel } from '@/features/routines/routine';
import type { SetType } from '@/features/workout/activeWorkout';
import { pace } from '@/features/workout/cardio';
import type { ChangeReason, Energy, ExerciseChangeReason } from '@/features/workout/session';
import { supabase } from '@/lib/supabase';

import type { HistoryEntry } from './entries';
import { toSavePayload, type PastWorkout } from './pastWorkout';

// All your finished workouts with their totals, newest first (see
// workout_summaries()); skipped days aren't workouts. A few hundred rows a
// year, so they're loaded at once and shared by the calendar, the lists
// and Profile's numbers.
export async function fetchHistoryEntries(): Promise<HistoryEntry[]> {
  const { data, error } = await supabase.rpc('workout_summaries', {});
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    date: row.date,
    routineName: row.routine_name ?? null,
    // The database's check constraints guarantee the codes.
    routineLabel: (row.routine_label ?? null) as RoutineLabel | null,
    customLabel: row.routine_custom_label ?? null,
    logMode: row.log_mode as HistoryEntry['logMode'],
    durationS: row.duration_s ?? null,
    exercises: row.exercises,
    sets: row.sets,
    volumeKg: Number(row.volume_kg),
    distanceM: row.distance_m,
    runDistanceM: row.run_distance_m,
    pace: pace([{ distanceM: row.pace_distance_m, durationS: row.pace_duration_s }]),
    pending: false,
  }));
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
