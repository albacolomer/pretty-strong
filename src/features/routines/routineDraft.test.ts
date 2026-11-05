import type { Exercise } from '@/features/exercises/exercise';

import { formatDuration, NO_TARGETS, type Routine } from './routine';
import {
  addExercises,
  addRunBlock,
  addSet,
  blockKindOf,
  draftFromRoutine,
  dropExercise,
  emptyRoutineDraft,
  exerciseSegments,
  hasChanges,
  leaveSuperset,
  makeSuperset,
  removeExercise,
  removeSet,
  type RoutineDraft,
  setExerciseNotes,
  setLabel,
  setPlannedDuration,
  setRepetitions,
  setRest,
  toggleWeekday,
  toSaveInput,
  updateBlockTargets,
  updateSetTargets,
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
    videoUrl: null,
    photoPath: null,
  };
}

const upperBody: Routine = {
  id: 'routine-1',
  name: 'Tren superior 1',
  label: 'strength',
  customLabel: null,
  plannedDurationS: null,
  notes: null,
  description: null,
  weekdays: [1, 4],
  dayPositions: { 1: 0, 4: 0 },
  exercises: [
    // 4 × 10 at 42,5 kg.
    {
      id: 're-1',
      exerciseId: 'lat',
      exercise: exercise('lat'),
      restS: 120,
      groupKey: null,
      notes: null,
      sets: Array(4).fill({ ...NO_TARGETS, reps: 10, weightKg: 42.5 }),
    },
    // 3 sets, no plan.
    {
      id: 're-2',
      exerciseId: 'row',
      exercise: exercise('row'),
      restS: null,
      groupKey: null,
      notes: null,
      sets: Array(3).fill(NO_TARGETS),
    },
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

    const noPlan = {
      target_weight_kg: null,
      target_reps: null,
      target_duration_s: null,
      target_distance_m: null,
      target_speed_kmh: null,
      target_incline_pct: null,
      target_level: null,
    };
    const tenAt42 = { ...noPlan, target_reps: 10, target_weight_kg: 42.5 };
    expect(toSaveInput(draft, 'routine-1')).toEqual({
      id: 'routine-1',
      name: 'Tren superior 1',
      label: 'strength',
      customLabel: null,
      plannedDurationS: null,
      notes: null,
      description: null,
      weekdays: [1, 4],
      exercises: [
        { id: 're-1', exercise_id: 'lat', rest_s: 120, group_key: null, notes: null, sets: Array(4).fill(tenAt42) },
        { id: 're-2', exercise_id: 'row', rest_s: null, group_key: null, notes: null, sets: Array(3).fill(noPlan) },
        { exercise_id: 'curl', rest_s: null, group_key: null, notes: null, sets: [noPlan] },
      ],
    });
  });

  test('keeps a custom name only for custom routines, and sorts the days', () => {
    const draft: RoutineDraft = {
      ...draftFromRoutine(upperBody),
      customLabel: ' Natació ',
      weekdays: [5, 1],
    };

    expect(toSaveInput(draft, null)).toMatchObject({ customLabel: null, weekdays: [1, 5] });
    expect(toSaveInput({ ...draft, label: 'custom' }, null)).toMatchObject({
      customLabel: 'Natació',
    });
  });
});

describe('hasChanges', () => {
  test('is false for the saved routine, true after any change', () => {
    const saved = draftFromRoutine(upperBody);

    expect(hasChanges(draftFromRoutine(upperBody), saved)).toBe(false);
    expect(hasChanges({ ...saved, name: 'Tren superior 2' }, saved)).toBe(true);
    expect(hasChanges(addSet(saved, 're-1'), saved)).toBe(true);
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
  test('adds exercises at the end with one empty set and no rest of their own', () => {
    const draft = addExercises(draftFromRoutine(upperBody), ['curl', 'dip']);

    expect(exerciseIds(draft)).toEqual(['lat', 'row', 'curl', 'dip']);
    expect(draft.exercises[2]).toMatchObject({ id: null, restS: null });
    expect(draft.exercises[2].sets.map((set) => set.targets)).toEqual([NO_TARGETS]);
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

describe('sets', () => {
  test('a new set copies the last one, up to 20', () => {
    let draft = draftFromRoutine(upperBody);
    const lastKey = draft.exercises[1].sets[2].key;
    draft = updateSetTargets(draft, 're-2', lastKey, (targets) => ({ ...targets, reps: 8 }));
    draft = addSet(draft, 're-2');

    const sets = draft.exercises[1].sets;
    expect(sets.map((set) => set.targets.reps)).toEqual([null, null, 8, 8]);
    // A row of its own, not the same one twice.
    expect(new Set(sets.map((set) => set.key)).size).toBe(4);

    for (let i = 0; i < 30; i += 1) draft = addSet(draft, 're-2');
    expect(draft.exercises[1].sets).toHaveLength(20);
  });

  test('removes the set you tap, and keeps the last one', () => {
    let draft = draftFromRoutine(upperBody);
    const [first, second] = draft.exercises[1].sets;
    draft = updateSetTargets(draft, 're-2', second.key, (targets) => ({ ...targets, reps: 12 }));

    draft = removeSet(draft, 're-2', first.key);
    expect(draft.exercises[1].sets.map((set) => set.key)).not.toContain(first.key);
    expect(draft.exercises[1].sets[0].targets.reps).toBe(12);

    draft = removeSet(draft, 're-2', draft.exercises[1].sets[0].key);
    const onlyOne = removeSet(draft, 're-2', draft.exercises[1].sets[0].key);
    expect(onlyOne.exercises[1].sets).toHaveLength(1);
  });

  test('changes one set’s plan only, so a pyramid can be planned', () => {
    const draft = draftFromRoutine(upperBody);
    const second = draft.exercises[0].sets[1].key;

    const pyramid = updateSetTargets(draft, 're-1', second, (targets) => ({
      ...targets,
      weightKg: 45,
    }));

    expect(pyramid.exercises[0].sets.map((set) => set.targets.weightKg)).toEqual([
      42.5, 45, 42.5, 42.5,
    ]);
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

  test('makes a superset: the other exercise moves right after, with the same rest and rounds', () => {
    let draft = fiveExercises();
    draft = setRest(draft, keyOf(draft, 'face'), 60);
    // face has 1 set and lat 4: face gets 3 more, copies of its own.
    draft = makeSuperset(draft, keyOf(draft, 'face'), 're-1');

    expect(groups(draft)).toEqual(['row', 'face+lat', 'curl', 'dip']);
    const byId = (id: string) => draft.exercises.find((e) => e.exerciseId === id)!;
    expect(byId('lat').restS).toBe(60);
    expect(byId('lat').sets).toHaveLength(4);
    expect(byId('face').sets).toHaveLength(4);
  });

  test('a third exercise makes it a circuit; a set added or taken is a round for all', () => {
    let draft = fiveExercises();
    draft = makeSuperset(draft, keyOf(draft, 'face'), keyOf(draft, 'curl'));
    draft = makeSuperset(draft, keyOf(draft, 'curl'), keyOf(draft, 'dip'));
    draft = addSet(draft, keyOf(draft, 'dip'));
    draft = setRest(draft, keyOf(draft, 'face'), 90);

    expect(groups(draft)).toEqual(['lat', 'row', 'face+curl+dip']);
    expect(draft.exercises.slice(2).map((e) => [e.sets.length, e.restS])).toEqual([
      [2, 90],
      [2, 90],
      [2, 90],
    ]);
    // Group keys are only unique within the routine.
    expect(draft.exercises[2].groupKey).toBe('g1');

    const curl = draft.exercises.find((e) => e.exerciseId === 'curl')!;
    const fewer = removeSet(draft, curl.key, curl.sets[0].key);
    expect(fewer.exercises.slice(2).map((e) => e.sets.length)).toEqual([1, 1, 1]);
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

    // dip (index 4) dropped between lat and row: joins them, with their 4 rounds.
    const joined = { ...draft, exercises: dropExercise(draft.exercises, 4, 1) };
    expect(groups(joined)).toEqual(['lat+dip+row', 'face', 'curl']);
    expect(joined.exercises[1].sets).toHaveLength(4);

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

describe('weekdays', () => {
  test('tapping a day adds it, tapping it again takes it off; saved Monday first', () => {
    let draft = toggleWeekday(emptyRoutineDraft(), 4);
    draft = toggleWeekday(draft, 1);
    expect(toSaveInput(draft, null).weekdays).toEqual([1, 4]);

    expect(toggleWeekday(draft, 4).weekdays).toEqual([1]);
  });
});

describe('routine types', () => {
  // In these tests, only the "run" exercise is a run.
  const isRun = (exerciseId: string) => exerciseId === 'run';

  test('a type with a duration starts at 1 hour; a class takes the exercises out', () => {
    const draft = draftFromRoutine(upperBody);

    expect(setLabel(draft, 'hybrid', isRun)).toMatchObject({
      plannedDurationS: 3600,
      exercises: draft.exercises,
    });
    expect(setLabel(draft, 'class', isRun).exercises).toEqual([]);
    expect(setLabel({ ...draft, plannedDurationS: 2700 }, 'class', isRun).plannedDurationS).toBe(
      2700,
    );
  });

  test('a run keeps only run exercises, as blocks without supersets', () => {
    let draft = addExercises(draftFromRoutine(upperBody), ['run', 'run']);
    draft = makeSuperset(draft, draft.exercises[2].key, draft.exercises[3].key);

    const run = setLabel(draft, 'run', isRun);

    expect(run.exercises.map((e) => [e.exerciseId, e.groupKey])).toEqual([
      ['run', null],
      ['run', null],
    ]);
  });

  test('adds run blocks: one repetition, or 6 with 1:30 recovery', () => {
    const draft = addRunBlock(
      addRunBlock({ ...emptyRoutineDraft(), label: 'run' }, 'distance', 'run'),
      'intervals',
      'run',
    );

    expect(draft.exercises.map((e) => [e.runBlock, e.sets.length, e.restS])).toEqual([
      ['distance', 1, null],
      ['intervals', 6, 90],
    ]);
    expect(blockKindOf(draft.exercises[1])).toBe('intervals');
  });

  test('a run block needs its distance or time to be saved', () => {
    const draft = addRunBlock(
      { ...emptyRoutineDraft(), name: '10K', label: 'run' },
      'time',
      'run',
    );
    const key = draft.exercises[0].key;

    expect(validateRoutineDraft(draft)).toEqual({ blocks: 'blocksIncomplete' });
    const timed = updateBlockTargets(draft, key, (targets) => ({ ...targets, durationS: 2700 }));
    expect(validateRoutineDraft(timed)).toEqual({});
  });

  test('a block’s repetitions are sets with the same numbers', () => {
    let draft = addRunBlock({ ...emptyRoutineDraft(), label: 'run' }, 'intervals', 'run');
    const key = draft.exercises[0].key;
    draft = updateBlockTargets(draft, key, (targets) => ({ ...targets, distanceM: 400 }));
    draft = setRepetitions(draft, key, 8);

    expect(draft.exercises[0].sets.map((set) => set.targets.distanceM)).toEqual(
      Array(8).fill(400),
    );
    expect(setRepetitions(draft, key, 3).exercises[0].sets).toHaveLength(3);
  });

  test('the duration is only saved for types that use it, between 5 minutes and 10 hours', () => {
    const hybrid = setLabel(draftFromRoutine(upperBody), 'hybrid', isRun);

    expect(toSaveInput(hybrid, null).plannedDurationS).toBe(3600);
    expect(toSaveInput({ ...hybrid, label: 'strength' }, null).plannedDurationS).toBeNull();
    expect(setPlannedDuration(hybrid, 0).plannedDurationS).toBe(300);
    expect(setPlannedDuration(hybrid, 99 * 3600).plannedDurationS).toBe(36000);
    expect(setPlannedDuration(hybrid, null).plannedDurationS).toBeNull();
  });

  test('formats durations as minutes and hours', () => {
    expect(formatDuration(45 * 60)).toBe('45 min');
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(75 * 60)).toBe('1 h 15 min');
  });
});
