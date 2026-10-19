import { useEffect } from 'react';

import { applyLastTime, type ActiveWorkout } from './activeWorkout';
import { fetchLastTime } from './api';
import { useWorkoutStore } from './workoutStore';

// Fetches last time's numbers once for a workout and pre-fills it. With no
// signal, the plan stays and it tries again the next time the workout
// screen opens.
export function useLastTime(workout: ActiveWorkout) {
  const update = useWorkoutStore((state) => state.update);
  const { id, routineId, lastTimeLoaded } = workout;
  // A key, so new exercises in the list would fetch again.
  const exerciseIds = [...new Set(workout.exercises.map((exercise) => exercise.exerciseId))].join(',');

  useEffect(() => {
    if (lastTimeLoaded || exerciseIds === '') return;
    let cancelled = false;
    fetchLastTime(routineId, exerciseIds.split(','))
      .then((lastTime) => {
        if (cancelled) return;
        update((current) =>
          current.id === id && !current.lastTimeLoaded ? applyLastTime(current, lastTime) : current,
        );
      })
      .catch(() => {
        // No signal: the plan stays for now.
      });
    return () => {
      cancelled = true;
    };
  }, [id, routineId, lastTimeLoaded, exerciseIds, update]);
}
