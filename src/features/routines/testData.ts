// Shared test data for the routines feature (only imported by tests).
import type { Exercise } from '@/features/exercises/exercise';

import { NO_TARGETS, type Routine } from './routine';

export function testExercise(id: string, ca: string): Exercise {
  return {
    id,
    slug: id,
    names: { ca, es: `${ca} (es)`, en: `${ca} (en)` },
    name: null,
    trackingType: 'weight_reps',
    primaryMuscles: ['lats'],
    secondaryMuscles: [],
    equipment: 'cable',
    isUnilateral: false,
  };
}

export const upperBody: Routine = {
  id: 'routine-1',
  name: 'Tren superior 1',
  label: 'strength',
  customLabel: null,
  plannedDurationS: null,
  notes: null,
  description: null,
  weekdays: [],
  dayPositions: {},
  exercises: ['Tracció al pit', 'Rem assegut amb politja', 'Face pull', 'Curl martell'].map(
    (ca, index) => ({
      id: `re-${index + 1}`,
      exerciseId: `exercise-${index + 1}`,
      exercise: testExercise(`exercise-${index + 1}`, ca),
      restS: null,
      groupKey: null,
      notes: null,
      // Three sets, no plan yet.
      sets: [NO_TARGETS, NO_TARGETS, NO_TARGETS],
    }),
  ),
};

const runExercise: Exercise = { ...testExercise('run', 'Córrer'), trackingType: 'run' };

// A run routine: a 1 km warm-up, then 2 × 400 m with 1:30 recovery. Both
// blocks are the same run exercise.
export const sundayRun: Routine = {
  ...upperBody,
  id: 'routine-run',
  name: 'Sèries de diumenge',
  label: 'run',
  exercises: [
    {
      id: 're-warmup',
      exerciseId: 'run',
      exercise: runExercise,
      restS: null,
      groupKey: null,
      notes: null,
      sets: [{ ...NO_TARGETS, distanceM: 1000 }],
    },
    {
      id: 're-intervals',
      exerciseId: 'run',
      exercise: runExercise,
      restS: 90,
      groupKey: null,
      notes: null,
      sets: [
        { ...NO_TARGETS, distanceM: 400 },
        { ...NO_TARGETS, distanceM: 400 },
      ],
    },
  ],
};

// A cardio machine, e.g. the stairmaster.
export function cardioExercise(id: string, ca: string): Exercise {
  return { ...testExercise(id, ca), trackingType: 'cardio_machine', equipment: 'stair_climber' };
}
