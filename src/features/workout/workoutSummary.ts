import { shownNumbers, type ActiveExercise, type ActiveWorkout } from './activeWorkout';
import { compareToLastTime, type Comparison } from './compareToLastTime';

// The finish summary (US-21, spec: WorkoutSummary): worked out from the
// sets, never stored (data rule 2). No React here.

export type WorkoutSummary = {
  durationS: number;
  // Exercises with at least one set done.
  exercises: number;
  sets: number;
  // Weight × reps over every set done with both, in kg.
  volumeKg: number;
  // Exercises that beat last time.
  highlights: { exercise: ActiveExercise; comparison: Comparison }[];
};

export function summarize(workout: ActiveWorkout, endedAt: string): WorkoutSummary {
  const done = workout.exercises
    .filter((exercise) => exercise.change !== 'skipped')
    .map((exercise) => ({
      exercise,
      sets: exercise.sets.filter((set) => set.completedAt !== null).map(shownNumbers),
    }))
    .filter(({ sets }) => sets.length > 0);

  const volumeKg = done
    .flatMap(({ sets }) => sets)
    .reduce((total, set) => total + (set.weightKg ?? 0) * (set.reps ?? 0), 0);

  const highlights = done.flatMap(({ exercise, sets }) => {
    const comparison = exercise.previous
      ? compareToLastTime(exercise.exercise.trackingType, sets, exercise.previous)
      : null;
    return comparison?.direction === 'up' ? [{ exercise, comparison }] : [];
  });

  return {
    durationS: Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000),
    ),
    exercises: done.length,
    sets: done.reduce((total, { sets }) => total + sets.length, 0),
    // Rounded to grams' worth, so 42.5 × 8 adds up cleanly.
    volumeKg: Math.round(volumeKg * 100) / 100,
    highlights,
  };
}
