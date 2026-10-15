// Shared test data for the routines feature (only imported by tests).
import type { Exercise } from '@/features/exercises/exercise';

import type { Routine } from './routine';

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
  notes: null,
  exercises: ['Tracció al pit', 'Rem assegut amb politja', 'Face pull', 'Curl martell'].map(
    (ca, index) => ({
      id: `re-${index + 1}`,
      exerciseId: `exercise-${index + 1}`,
      exercise: testExercise(`exercise-${index + 1}`, ca),
      plannedSets: 3,
      restS: null,
      groupKey: null,
      notes: null,
    }),
  ),
};
