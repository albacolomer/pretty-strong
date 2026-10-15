import {
  draftFromExercise,
  emptyDraft,
  saveErrorReason,
  togglePrimaryMuscle,
  toggleSecondaryMuscle,
  validateDraft,
  type ExerciseDraft,
} from './exerciseDraft';

const valid: ExerciseDraft = {
  ...emptyDraft('Hip thrust unilateral'),
  primaryMuscles: ['glutes'],
  equipment: 'barbell',
};

describe('emptyDraft', () => {
  test('starts with weight and reps, no equipment and an optional name', () => {
    expect(emptyDraft('Press raro')).toMatchObject({
      name: 'Press raro',
      trackingType: 'weight_reps',
      equipment: 'none',
    });
  });
});

describe('draftFromExercise', () => {
  test('starts editing from the saved exercise', () => {
    const draft = draftFromExercise({
      id: 'custom-1',
      slug: null,
      names: null,
      name: 'Press raro',
      trackingType: 'weight_reps',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps'],
      equipment: 'dumbbell',
      isUnilateral: true,
    });

    expect(draft).toEqual({
      name: 'Press raro',
      trackingType: 'weight_reps',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps'],
      equipment: 'dumbbell',
      isUnilateral: true,
    });
  });
});

describe('validateDraft', () => {
  test('accepts a complete draft', () => {
    expect(validateDraft(valid)).toEqual({});
  });

  test('a strength exercise needs a name and a main muscle', () => {
    expect(validateDraft(emptyDraft('   '))).toEqual({
      name: 'required',
      primaryMuscles: 'musclesRequired',
    });
    expect(validateDraft({ ...emptyDraft('Plank amb pes'), trackingType: 'duration' })).toEqual({
      primaryMuscles: 'musclesRequired',
    });
  });

  test.each(['cardio_machine', 'run'] as const)('%s works without muscles', (trackingType) => {
    expect(validateDraft({ ...emptyDraft('Cursa de muntanya'), trackingType })).toEqual({});
  });

  test('keeps names to 60 characters, ignoring surrounding spaces', () => {
    expect(validateDraft({ ...valid, name: `  ${'a'.repeat(60)}  ` })).toEqual({});
    expect(validateDraft({ ...valid, name: 'a'.repeat(61) })).toEqual({ name: 'nameTooLong' });
  });
});

describe('muscle toggles', () => {
  test('a muscle picked as main leaves the secondary ones', () => {
    const draft = { ...valid, secondaryMuscles: ['hamstrings', 'quads'] } satisfies ExerciseDraft;

    const next = togglePrimaryMuscle(draft, 'hamstrings');

    expect(next.primaryMuscles).toEqual(['glutes', 'hamstrings']);
    expect(next.secondaryMuscles).toEqual(['quads']);
  });

  test('tapping again removes it', () => {
    expect(togglePrimaryMuscle(valid, 'glutes').primaryMuscles).toEqual([]);
    const withSecondary = toggleSecondaryMuscle(valid, 'calves');
    expect(toggleSecondaryMuscle(withSecondary, 'calves').secondaryMuscles).toEqual([]);
  });
});

describe('saveErrorReason', () => {
  test('a duplicate name (unique index) is nameTaken', () => {
    expect(saveErrorReason({ code: '23505', message: 'duplicate key value' })).toBe('nameTaken');
  });

  test('no signal is network', () => {
    expect(saveErrorReason({ code: '', message: 'TypeError: Network request failed' })).toBe(
      'network',
    );
  });

  test('anything else is unknown', () => {
    expect(saveErrorReason({ code: '42501', message: 'row-level security' })).toBe('unknown');
    expect(saveErrorReason(new Error('Boom'))).toBe('unknown');
  });
});
