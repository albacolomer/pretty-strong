import type { Exercise } from '@/features/exercises/exercise';

import type { Routine } from './routine';
import {
  addExercises,
  draftFromRoutine,
  dropExercise,
  emptyRoutineDraft,
  exerciseSegments,
  hasChanges,
  leaveSuperset,
  makeSuperset,
  removeExercise,
  type RoutineDraft,
  setExerciseNotes,
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
    expect(hasChanges({ ...saved, exercises: dropExercise(saved.exercises, 1, 0) }, saved)).toBe(
      true,
    );
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

  test('a drag moves one exercise to its new place', () => {
    const draft = addExercises(draftFromRoutine(upperBody), ['curl']);

    expect(dropExercise(draft.exercises, 2, 0).map((e) => e.exerciseId)).toEqual([
      'curl',
      'lat',
      'row',
    ]);
  });

  test('keeps planned sets between 1 and 20', () => {
    const draft = draftFromRoutine(upperBody);

    expect(setPlannedSets(draft, 're-1', 0).exercises[0].plannedSets).toBe(1);
    expect(setPlannedSets(draft, 're-1', 25).exercises[0].plannedSets).toBe(20);
  });

  test('keeps this routine’s note on an exercise, trimmed, and empty as null', () => {
    const draft = setExerciseNotes(draftFromRoutine(upperBody), 're-2', '  Agafada ampla ');
    const saved = toSaveInput(setExerciseNotes(draft, 're-1', '   '), 'routine-1');

    expect(saved.exercises.map((e) => e.notes)).toEqual([null, 'Agafada ampla']);
  });

  test('sets or clears an exercise’s own rest', () => {
    const draft = draftFromRoutine(upperBody);

    expect(setRest(draft, 're-2', 90).exercises[1].restS).toBe(90);
    expect(setRest(draft, 're-1', null).exercises[0].restS).toBeNull();
  });
});

describe('supersets and circuits', () => {
  // lat, row, face, curl, dip: five exercises, none grouped.
  const fiveExercises = (): RoutineDraft =>
    addExercises(draftFromRoutine(upperBody), ['face', 'curl', 'dip']);
  const keyOf = (draft: RoutineDraft, exerciseId: string) =>
    draft.exercises.find((e) => e.exerciseId === exerciseId)!.key;
  const groups = (draft: RoutineDraft) =>
    exerciseSegments(draft.exercises).map((segment) =>
      segment.items.map((e) => e.exerciseId).join('+'),
    );

  test('makes a superset: the other exercise moves right after, with the same rounds and rest', () => {
    let draft = fiveExercises();
    draft = setPlannedSets(draft, keyOf(draft, 'face'), 4);
    draft = setRest(draft, keyOf(draft, 'face'), 60);
    draft = makeSuperset(draft, keyOf(draft, 'face'), 're-1');

    expect(groups(draft)).toEqual(['row', 'face+lat', 'curl', 'dip']);
    const lat = draft.exercises.find((e) => e.exerciseId === 'lat')!;
    expect(lat).toMatchObject({ plannedSets: 4, restS: 60 });
  });

  test('a third exercise makes it a circuit; rounds and rest change for the whole group', () => {
    let draft = fiveExercises();
    draft = makeSuperset(draft, keyOf(draft, 'face'), keyOf(draft, 'curl'));
    draft = makeSuperset(draft, keyOf(draft, 'curl'), keyOf(draft, 'dip'));
    draft = setPlannedSets(draft, keyOf(draft, 'dip'), 5);
    draft = setRest(draft, keyOf(draft, 'face'), 90);

    expect(groups(draft)).toEqual(['lat', 'row', 'face+curl+dip']);
    expect(draft.exercises.slice(2).map((e) => [e.plannedSets, e.restS])).toEqual([
      [5, 90],
      [5, 90],
      [5, 90],
    ]);
    // Group keys are only unique within the routine.
    expect(draft.exercises[2].groupKey).toBe('g1');
  });

  test('leaving a group puts the exercise after it; a group of one is no group', () => {
    let draft = fiveExercises();
    draft = makeSuperset(draft, 're-1', 're-2');
    draft = makeSuperset(draft, 're-1', keyOf(draft, 'face'));

    const circuitLeft = leaveSuperset(draft, 're-1');
    expect(groups(circuitLeft)).toEqual(['row+face', 'lat', 'curl', 'dip']);

    expect(groups(leaveSuperset(circuitLeft, 're-2'))).toEqual(['face', 'row', 'lat', 'curl', 'dip']);
    expect(groups(removeExercise(circuitLeft, 're-2'))).toEqual(['face', 'lat', 'curl', 'dip']);
  });

  test('a drag between two exercises of a group joins it; away from its group leaves it', () => {
    let draft = fiveExercises();
    draft = makeSuperset(draft, 're-1', 're-2'); // lat+row, face, curl, dip

    // dip (index 4) dropped between lat and row: joins them.
    const joined = { ...draft, exercises: dropExercise(draft.exercises, 4, 1) };
    expect(groups(joined)).toEqual(['lat+dip+row', 'face', 'curl']);

    // row (index 1) dragged to the end: leaves, and lat is on its own again.
    const left = { ...draft, exercises: dropExercise(draft.exercises, 1, 4) };
    expect(groups(left)).toEqual(['lat', 'face', 'curl', 'dip', 'row']);

    // Swapping the two inside the superset keeps it.
    const swapped = { ...draft, exercises: dropExercise(draft.exercises, 1, 0) };
    expect(groups(swapped)).toEqual(['row+lat', 'face', 'curl', 'dip']);

    // Dropped right after a group (not between two of it): stays on its own.
    const after = { ...draft, exercises: dropExercise(draft.exercises, 4, 2) };
    expect(groups(after)).toEqual(['lat+row', 'dip', 'face', 'curl']);
  });
});
