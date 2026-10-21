import { randomUUID } from 'expo-crypto';
import { useTranslation } from 'react-i18next';

import { cancelScheduled, scheduleAt } from '@/lib/notifications';

import type { ActiveWorkout } from './activeWorkout';
import {
  adjustRest,
  pauseRest,
  resumeRest,
  startRest,
  type NextSet,
  type RestTimer,
} from './restTimer';
import { useExerciseTitle } from './useExerciseTitle';
import { useWorkoutStore } from './workoutStore';

// Runs the workout's rest timer and keeps its "rest is over" notification
// in step: scheduled for the moment rest ends, moved when that moment
// moves, cancelled on pause or skip.
export function useRestTimer(workout: ActiveWorkout) {
  const { t } = useTranslation();
  const titleOf = useExerciseTitle();
  const update = useWorkoutStore((state) => state.update);
  const rest = workout.rest;

  // "Següent: Rem assegut, sèrie 3".
  function nextLabel(next: NextSet | null): string {
    const exercise = workout.exercises.find((item) => item.id === next?.exerciseId);
    if (!exercise || !next) return '';
    return t('workout.nextUp', {
      name: titleOf(exercise),
      number: exercise.sets.findIndex((set) => set.id === next.setId) + 1,
    });
  }

  function setRest(timer: RestTimer | null) {
    update((current) => ({ ...current, rest: timer }));
  }

  // Scheduling takes a moment: if the rest changed meanwhile (paused,
  // moved, skipped), that notification is cancelled straight away.
  function schedule(timer: RestTimer) {
    if (!timer.endsAt) return;
    void scheduleAt(new Date(timer.endsAt), t('workout.restOver'), nextLabel(timer.next)).then(
      (notificationId) => {
        const current = useWorkoutStore.getState().active?.rest;
        if (current?.id === timer.id && current.endsAt === timer.endsAt) {
          setRest({ ...current, notificationId });
        } else {
          void cancelScheduled(notificationId);
        }
      },
    );
  }

  return {
    rest,
    nextLabel: rest ? nextLabel(rest.next) : '',
    start(seconds: number, next: NextSet | null) {
      void cancelScheduled(rest?.notificationId ?? null);
      const timer = startRest(randomUUID(), seconds, Date.now(), next);
      setRest(timer);
      schedule(timer);
    },
    pause() {
      if (!rest) return;
      void cancelScheduled(rest.notificationId);
      setRest(pauseRest(rest, Date.now()));
    },
    resume() {
      if (!rest) return;
      const resumed = resumeRest(rest, Date.now());
      setRest(resumed);
      schedule(resumed);
    },
    adjust(deltaS: number) {
      if (!rest) return;
      void cancelScheduled(rest.notificationId);
      const adjusted = adjustRest(rest, deltaS, Date.now());
      setRest(adjusted);
      schedule(adjusted);
    },
    skip() {
      if (!rest) return;
      void cancelScheduled(rest.notificationId);
      setRest(null);
    },
    // Over: its notification has gone off (or is going off) by itself.
    end() {
      setRest(null);
    },
  };
}
