import type { Exercise } from '@/features/exercises/exercise';

import type { Routine } from './routine';
import {
  addExercises,
  draftFromRoutine,
  emptyRoutineDraft,
  hasChanges,
  moveExercise,
  removeExercise,
  setPlannedSets,
  setRest,
  toSaveInput,
  validateRoutineDraft,
} from './routineDraft';

function exercise(id: string): Exercise {
  return {
    id,
    slug: id,
    names: { ca: id, es: id, en: id },
    name: null,
    trackingType: 'weight_reps',
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: 'none',
    isUnilateral: false,
  };
}

const upperBody: Routine = {
  id: 'routine-1',
  name: 'Tren superior 1',
  label: 'strength',
  notes: null,
  exercises: [
    { id: 're-1', exerciseId: 'lat', exercise: exercise('lat'), plannedSets: 4, restS: 120, groupKey: null, notes: null },
    { id: 're-2', exerciseId: 'row', exercise: exercise('row'), plannedSets: 3, restS: null, groupKey: null, notes: null },
  ],
};

const exerciseIds = (draft: ReturnType<typeof emptyRoutineDraft>) =>
  draft.exercises.map((e) => e.exerciseId);

describe('validateRoutineDraft', () => {
  test('needs a name of up to 60 characters', () => {
    expect(validateRoutineDraft({ ...emptyRoutineDraft(), name: '  ' })).toEqual({ name: 'required' });
    expect(validateRoutineDraft({ ...emptyRoutineDraft(), name: 'a'.repeat(61) })).toEqual({
      name: 'nameTooLong',
    });
    expect(validateRoutineDraft({ ...emptyRoutineDraft(), name: 'Cames' })).toEqual({});
  });
});

describe('toSaveInput', () => {
  test('trims text, stores empty notes as null and keeps ids of saved exercises only', () => {
    const draft = addExercises(
      { ...draftFromRoutine(upperBody), name: '  Tren superior 1 ', notes: '  ' },
      ['curl'],
    );

    expect(toSaveInput(draft, 'routine-1')).toEqual({
      id: 'routine-1',
      name: 'Tren superior 1',
      label: 'strength',
      notes: null,
      exercises: [
        { id: 're-1', exercise_id: 'lat', planned_sets: 4, rest_s: 120, group_key: null, notes: null },
        { id: 're-2', exercise_id: 'row', planned_sets: 3, rest_s: null, group_key: null, notes: null },
        { exercise_id: 'curl', planned_sets: 3, rest_s: null, group_key: null, notes: null },
      ],
    });
  });
});

describe('hasChanges', () => {
  test('is false for the saved routine, true after any change', () => {
    const saved = draftFromRoutine(upperBody);

    expect(hasChanges(draftFromRoutine(upperBody), saved)).toBe(false);
    expect(hasChanges({ ...saved, name: 'Tren superior 2' }, saved)).toBe(true);
    expect(hasChanges(setPlannedSets(saved, 're-1', 5), saved)).toBe(true);
    expect(hasChanges(moveExercise(saved, 're-2', -1), saved)).toBe(true);
  });

  test('ignores spaces that saving would trim anyway', () => {
    const saved = draftFromRoutine(upperBody);
    expect(hasChanges({ ...saved, name: 'Tren superior 1  ' }, saved)).toBe(false);
  });
});

describe('editing the exercise list', () => {
  test('adds exercises at the end with 3 sets and no rest of their own', () => {
    const draft = addExercises(draftFromRoutine(upperBody), ['curl', 'dip']);

    expect(exerciseIds(draft)).toEqual(['lat', 'row', 'curl', 'dip']);
    expect(draft.exercises[2]).toMatchObject({ id: null, plannedSets: 3, restS: null });
    expect(draft.exercises[2].key).not.toBe(draft.exercises[3].key);
  });

  test('removes one exercise', () => {
    expect(exerciseIds(removeExercise(draftFromRoutine(upperBody), 're-1'))).toEqual(['row']);
  });

  test('moves up and down, but not past the ends', () => {
    const draft = draftFromRoutine(upperBody);

    expect(exerciseIds(moveExercise(draft, 're-2', -1))).toEqual(['row', 'lat']);
    expect(exerciseIds(moveExercise(draft, 're-1', 1))).toEqual(['row', 'lat']);
    expect(moveExercise(draft, 're-1', -1)).toBe(draft);
    expect(moveExercise(draft, 're-2', 1)).toBe(draft);
  });

  test('keeps planned sets between 1 and 20', () => {
    const draft = draftFromRoutine(upperBody);

    expect(setPlannedSets(draft, 're-1', 0).exercises[0].plannedSets).toBe(1);
    expect(setPlannedSets(draft, 're-1', 25).exercises[0].plannedSets).toBe(20);
  });

  test('sets or clears an exercise’s own rest', () => {
    const draft = draftFromRoutine(upperBody);

    expect(setRest(draft, 're-2', 90).exercises[1].restS).toBe(90);
    expect(setRest(draft, 're-1', null).exercises[0].restS).toBeNull();
  });
});
