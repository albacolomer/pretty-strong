import type { Exercise } from './exercise';
import { NO_FILTERS, normalizeForSearch, searchExercises } from './searchExercises';

function builtIn(
  slug: string,
  names: [ca: string, es: string, en: string],
  overrides: Partial<Exercise> = {},
): Exercise {
  return {
    id: slug,
    slug,
    names: { ca: names[0], es: names[1], en: names[2] },
    name: null,
    trackingType: 'weight_reps',
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: 'machine',
    isUnilateral: false,
    ...overrides,
  };
}

const latPulldown = builtIn('lat_pulldown', ['Tracció al pit', 'Jalón al pecho', 'Lat pulldown'], {
  primaryMuscles: ['lats'],
  equipment: 'cable',
});
const benchPress = builtIn(
  'barbell_bench_press',
  ['Press de banca amb barra', 'Press de banca con barra', 'Barbell bench press'],
  { primaryMuscles: ['chest'], secondaryMuscles: ['triceps'], equipment: 'barbell' },
);
const hipThrust = builtIn('hip_thrust', ['Hip thrust amb barra', 'Hip thrust con barra', 'Barbell hip thrust'], {
  primaryMuscles: ['glutes'],
  equipment: 'barbell',
});
const squat = builtIn('back_squat', ['Esquat amb barra', 'Sentadilla con barra', 'Barbell back squat'], {
  primaryMuscles: ['quads'],
  secondaryMuscles: ['glutes'],
  equipment: 'barbell',
});
const elliptical = builtIn('elliptical', ['El·líptica', 'Elíptica', 'Elliptical']);
const custom: Exercise = { ...builtIn('x', ['', '', '']), id: 'custom-1', slug: null, names: null, name: 'Mi press raro' };

const all = [latPulldown, benchPress, hipThrust, squat, elliptical, custom];
const slugsOrIds = (results: Exercise[]) => results.map((e) => e.slug ?? e.id);

describe('normalizeForSearch', () => {
  test('drops capitals, accents and the Catalan middle dot', () => {
    // "l·l" is a double l, so typing "ell" finds it.
    expect(normalizeForSearch('  El·líptica JALÓN ')).toBe('elliptica jalon');
  });
});

describe('searchExercises', () => {
  test('with no filters, returns everything sorted by name in the app language', () => {
    expect(slugsOrIds(searchExercises(all, NO_FILTERS, 'ca'))).toEqual([
      'elliptical', // El·líptica
      'back_squat', // Esquat amb barra
      'hip_thrust', // Hip thrust amb barra
      'custom-1', // Mi press raro
      'barbell_bench_press', // Press de banca amb barra
      'lat_pulldown', // Tracció al pit
    ]);
  });

  test('matches a name in any language, ignoring accents and capitals', () => {
    const search = (query: string) => slugsOrIds(searchExercises(all, { ...NO_FILTERS, query }, 'ca'));
    expect(search('jalon')).toEqual(['lat_pulldown']); // Spanish name
    expect(search('PULLDOWN')).toEqual(['lat_pulldown']); // English name
    expect(search('eliptica')).toEqual(['elliptical']);
  });

  test('needs every word, in any order, within the same name', () => {
    const search = (query: string) => slugsOrIds(searchExercises(all, { ...NO_FILTERS, query }, 'ca'));
    expect(search('banca press')).toEqual(['barbell_bench_press']);
    expect(search('press')).toEqual(['custom-1', 'barbell_bench_press']);
    expect(search('press pecho')).toEqual([]);
  });

  test('finds custom exercises by their single name', () => {
    expect(slugsOrIds(searchExercises(all, { ...NO_FILTERS, query: 'raro' }, 'ca'))).toEqual([
      'custom-1',
    ]);
  });

  test('a muscle filter lists primary matches before secondary ones', () => {
    const results = searchExercises(all, { ...NO_FILTERS, muscle: 'glutes' }, 'ca');
    expect(slugsOrIds(results)).toEqual(['hip_thrust', 'back_squat']);
  });

  test('filters by equipment, combined with the other filters', () => {
    const barbell = { ...NO_FILTERS, equipment: 'barbell' } as const;
    expect(slugsOrIds(searchExercises(all, barbell, 'en'))).toEqual([
      'back_squat', // Barbell back squat
      'barbell_bench_press', // Barbell bench press
      'hip_thrust', // Barbell hip thrust
    ]);
    expect(slugsOrIds(searchExercises(all, { ...barbell, muscle: 'chest' }, 'en'))).toEqual([
      'barbell_bench_press',
    ]);
  });
});
