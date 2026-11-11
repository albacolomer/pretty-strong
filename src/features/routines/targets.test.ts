import { NO_TARGETS, type ExerciseTargets } from './routine';
import {
  formatInput,
  inputValue,
  measuresOf,
  measuresToAdd,
  parseInput,
  readMeasures,
  routineInputs,
  TARGET_INPUTS,
  withInput,
  withoutMeasure,
} from './targets';

describe('TARGET_INPUTS', () => {
  test('each tracking type plans the numbers it logs', () => {
    expect(TARGET_INPUTS.weight_reps).toEqual(['reps', 'weightKg']);
    expect(TARGET_INPUTS.duration).toEqual(['minutes', 'seconds']);
    expect(TARGET_INPUTS.run).toEqual(['distanceKm', 'minutes', 'seconds']);
  });
});

describe('parseInput', () => {
  test('reads either decimal separator and rounds to the field’s decimals', () => {
    expect(parseInput('weightKg', '42,5')).toBe(42.5);
    expect(parseInput('weightKg', '42.555')).toBe(42.56);
    expect(parseInput('reps', '10')).toBe(10);
    expect(parseInput('distanceKm', '5,25')).toBe(5.25);
  });

  test('keeps numbers within the database limits', () => {
    expect(parseInput('reps', '0')).toBe(1);
    expect(parseInput('reps', '5000')).toBe(1000);
    expect(parseInput('seconds', '75')).toBe(59);
  });

  test('empty or unreadable text means no plan', () => {
    expect(parseInput('reps', '')).toBeNull();
    expect(parseInput('reps', '  ')).toBeNull();
    expect(parseInput('weightKg', 'abc')).toBeNull();
  });
});

describe('formatInput', () => {
  test('uses the language’s decimal separator', () => {
    expect(formatInput(42.5, 'ca')).toBe('42,5');
    expect(formatInput(42.5, 'en')).toBe('42.5');
    expect(formatInput(null, 'ca')).toBe('');
  });
});

describe('withInput and inputValue', () => {
  test('a run is planned in km and stored in metres', () => {
    const targets = withInput(NO_TARGETS, 'distanceKm', 5.25);

    expect(targets.distanceM).toBe(5250);
    expect(inputValue(targets, 'distanceKm')).toBe(5.25);
  });

  test('minutes and seconds make one duration; both empty is none', () => {
    let targets = withInput(NO_TARGETS, 'minutes', 1);
    targets = withInput(targets, 'seconds', 30);

    expect(targets.durationS).toBe(90);
    expect(inputValue(targets, 'minutes')).toBe(1);
    expect(inputValue(targets, 'seconds')).toBe(30);

    targets = withInput(targets, 'minutes', null);
    expect(targets.durationS).toBe(30);
    expect(withInput(targets, 'seconds', null).durationS).toBeNull();
  });
});

describe('measures (cardio machines and carries)', () => {
  const plan = (targets: Partial<ExerciseTargets>): ExerciseTargets => ({ ...NO_TARGETS, ...targets });

  test('a new one has its defaults; one saved before keeps what its plan uses', () => {
    expect(measuresOf('cardio_machine', null, [NO_TARGETS])).toEqual(['duration']);
    expect(measuresOf('weight_distance', null, [NO_TARGETS])).toEqual(['weight', 'distance']);
    // A stairmaster planned at level 8: time and level.
    expect(measuresOf('cardio_machine', null, [plan({ durationS: 600, level: 8 })])).toEqual([
      'duration',
      'level',
    ]);
  });

  test('once chosen, just those, in order, and always the one that stays', () => {
    expect(measuresOf('cardio_machine', ['level', 'incline'], [plan({ speedKmh: 5 })])).toEqual([
      'duration',
      'incline',
      'level',
    ]);
    // A sled push with no weight: just the distance.
    expect(measuresOf('weight_distance', [], [])).toEqual(['distance']);
    expect(measuresOf('weight_reps', null, [])).toEqual([]);
  });

  test('+ offers the rest', () => {
    expect(measuresToAdd('cardio_machine', ['duration', 'level'])).toEqual([
      'distance',
      'speed',
      'incline',
    ]);
    expect(measuresToAdd('weight_distance', ['weight', 'distance'])).toEqual(['duration']);
  });

  test('the fields: time is minutes and seconds; other types keep all theirs', () => {
    expect(routineInputs('cardio_machine', ['duration', 'incline'], [])).toEqual([
      'minutes',
      'seconds',
      'inclinePct',
    ]);
    expect(routineInputs('weight_distance', ['distance', 'duration'], [])).toEqual([
      'distanceM',
      'minutes',
      'seconds',
    ]);
    expect(routineInputs('weight_reps', ['duration'], [])).toEqual(TARGET_INPUTS.weight_reps);
  });

  test('taking one off clears its numbers', () => {
    const stairs = plan({ durationS: 600, inclinePct: 12, level: 8 });
    expect(withoutMeasure(stairs, 'incline')).toEqual({ ...stairs, inclinePct: null });
    expect(withoutMeasure(stairs, 'duration')).toEqual({ ...stairs, durationS: null });
  });

  test('saved text: unknown ones are dropped', () => {
    expect(readMeasures(null)).toBeNull();
    expect(readMeasures(['duration', 'rowing_strokes', 'level'])).toEqual(['duration', 'level']);
  });
});
