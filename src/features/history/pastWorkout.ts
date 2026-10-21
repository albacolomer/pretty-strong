import type { Exercise } from '@/features/exercises/exercise';
import type { TrackingType } from '@/features/exercises/vocabulary';
import { formatInput } from '@/features/routines/targets';
import type { SetNumbers, SetType } from '@/features/workout/activeWorkout';
import { formatPace, pace } from '@/features/workout/cardio';
import type { ChangeReason, Energy, ExerciseChangeReason } from '@/features/workout/session';
import { liveDuration } from '@/features/workout/session';
import { formatElapsed } from '@/features/workout/useElapsed';
import type { Language } from '@/lib/i18n';

// A finished workout as History shows it (US-23): what was saved, as it
// was saved. Totals are worked out here, never stored (data rule 2). No
// React here.

export type PastSet = {
  id: string;
  setType: SetType;
  numbers: SetNumbers;
  rpe: number | null;
  completedAt: string;
};

export type PastExercise = {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  // The routine's exercise it replaced, when it was swapped in.
  replaced: Exercise | null;
  routineExerciseId: string | null;
  groupKey: string | null;
  restS: number | null;
  change: 'added' | 'swapped' | 'skipped' | null;
  changeReason: ExerciseChangeReason | null;
  notes: string | null;
  sets: PastSet[];
};

export type PastWorkout = {
  id: string;
  date: string;
  plannedRoutineId: string | null;
  routineId: string | null;
  // Null for a workout without a routine.
  routineName: string | null;
  changeReason: ChangeReason | null;
  // 'live': timed by the app (startedAt to endedAt); 'quick': "Fet" on
  // Today, or logged afterwards, with a duration typed in.
  logMode: 'live' | 'quick';
  startedAt: string | null;
  endedAt: string | null;
  durationS: number | null;
  energy: Energy | null;
  notes: string | null;
  exercises: PastExercise[];
};

// A row of the History list.
export type HistoryEntry = {
  id: string;
  date: string;
  routineName: string | null;
  logMode: 'live' | 'quick';
  durationS: number | null;
  exercises: number;
  sets: number;
};

export function workoutDuration(
  workout: Pick<PastWorkout, 'durationS' | 'startedAt' | 'endedAt'>,
): number | null {
  return workout.durationS ?? liveDuration(workout.startedAt, workout.endedAt);
}

export type PastTotals = {
  durationS: number | null;
  // Exercises with sets (skipped ones have none).
  exercises: number;
  sets: number;
  volumeKg: number;
  distanceM: number;
};

export function pastTotals(workout: PastWorkout): PastTotals {
  const done = workout.exercises.filter((exercise) => exercise.sets.length > 0);
  const sets = done.flatMap((exercise) => exercise.sets);
  const volumeKg = sets.reduce(
    (total, set) => total + (set.numbers.weightKg ?? 0) * (set.numbers.reps ?? 0),
    0,
  );
  const distanceM = done
    .filter(({ exercise }) => ['run', 'cardio_machine'].includes(exercise.trackingType))
    .flatMap((exercise) => exercise.sets)
    .reduce((total, set) => total + (set.numbers.distanceM ?? 0), 0);
  return {
    durationS: workoutDuration(workout),
    exercises: done.length,
    sets: sets.length,
    volumeKg: Math.round(volumeKg * 100) / 100,
    distanceM,
  };
}

// The words a set's line needs, already translated.
export type SetLabels = { reps: (count: number) => string; level: string };

// One set as a line: "40 kg × 10", "10 reps", "1:00", "24 kg · 40 m",
// "10:00 · 5 km/h · 12 % · Nivell 8", "1 km · 5:30 · 5:30 /km". Only the
// numbers it has.
export function formatSetNumbers(
  trackingType: TrackingType,
  numbers: SetNumbers,
  language: Language,
  labels: SetLabels,
): string {
  const number = (value: number) => formatInput(value, language);
  const kg = numbers.weightKg === null ? null : `${number(numbers.weightKg)} kg`;
  const time = numbers.durationS === null ? null : formatElapsed(numbers.durationS * 1000);
  const join = (parts: (string | null)[]) => parts.filter((part) => part !== null).join(' · ');

  switch (trackingType) {
    case 'weight_reps':
      return numbers.reps === null ? (kg ?? '') : `${kg ? `${kg} × ` : '× '}${numbers.reps}`;
    case 'bodyweight_reps': {
      const reps = numbers.reps === null ? null : labels.reps(numbers.reps);
      const added = numbers.weightKg ? `+${kg}` : null;
      return join([added, reps]);
    }
    case 'duration':
      return time ?? '';
    case 'weight_distance':
      return join([kg, numbers.distanceM === null ? null : `${numbers.distanceM} m`]);
    case 'cardio_machine':
      return join([
        time,
        numbers.distanceM === null ? null : `${numbers.distanceM} m`,
        numbers.speedKmh === null ? null : `${number(numbers.speedKmh)} km/h`,
        numbers.inclinePct === null ? null : `${number(numbers.inclinePct)} %`,
        numbers.level === null ? null : `${labels.level} ${numbers.level}`,
      ]);
    case 'run': {
      const setPace = pace([numbers]);
      return join([
        numbers.distanceM === null ? null : `${number(numbers.distanceM / 1000)} km`,
        time,
        setPace === null ? null : formatPace(setPace),
      ]);
    }
  }
}

// What finish_workout() receives to save it again: after an edit, or to
// put it back with "Desfés" after deleting it. The same ids, so it replaces
// rather than copies.
export function toSavePayload(workout: PastWorkout) {
  return {
    id: workout.id,
    date: workout.date,
    planned_routine_id: workout.plannedRoutineId,
    routine_id: workout.routineId,
    change_reason: workout.changeReason,
    log_mode: workout.logMode,
    started_at: workout.startedAt,
    ended_at: workout.endedAt,
    duration_s: workout.durationS,
    energy: workout.energy,
    notes: workout.notes,
    exercises: workout.exercises.map((exercise) => ({
      id: exercise.id,
      exercise_id: exercise.exerciseId,
      routine_exercise_id: exercise.routineExerciseId,
      group_key: exercise.groupKey,
      rest_s: exercise.restS,
      change: exercise.change,
      swapped_from_id: exercise.replaced?.id ?? null,
      change_reason: exercise.changeReason,
      notes: exercise.notes,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        set_type: set.setType,
        weight_kg: set.numbers.weightKg,
        reps: set.numbers.reps,
        duration_s: set.numbers.durationS,
        distance_m: set.numbers.distanceM,
        speed_kmh: set.numbers.speedKmh,
        incline_pct: set.numbers.inclinePct,
        level: set.numbers.level,
        rpe: set.rpe,
        completed_at: set.completedAt,
      })),
    })),
  };
}
