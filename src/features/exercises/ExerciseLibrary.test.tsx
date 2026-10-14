import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import type { Exercise } from './exercise';
import { ExerciseLibrary } from './ExerciseLibrary';
import { useExercises } from './useExercises';

jest.mock('./useExercises', () => ({ useExercises: jest.fn() }));

function builtIn(slug: string, ca: string, overrides: Partial<Exercise>): Exercise {
  return {
    id: slug,
    slug,
    names: { ca, es: `${ca} (es)`, en: `${ca} (en)` },
    name: null,
    trackingType: 'weight_reps',
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: 'machine',
    isUnilateral: false,
    ...overrides,
  };
}

const exercises: Exercise[] = [
  builtIn('lat_pulldown', 'Tracció al pit', { primaryMuscles: ['lats'], equipment: 'cable' }),
  builtIn('hip_thrust', 'Hip thrust amb barra', { primaryMuscles: ['glutes'], equipment: 'barbell' }),
  builtIn('back_squat', 'Esquat amb barra', {
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    equipment: 'barbell',
  }),
];

beforeEach(() => {
  jest
    .mocked(useExercises)
    .mockReturnValue({ data: exercises, isPending: false, isError: false } as ReturnType<
      typeof useExercises
    >);
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExerciseLibrary />', () => {
  test('lists every exercise with its muscles and equipment', async () => {
    await render(<ExerciseLibrary />);

    expect(screen.getByText('3 exercicis')).toBeOnTheScreen();
    expect(screen.getByText('Tracció al pit')).toBeOnTheScreen();
    expect(screen.getByText('Dorsals · Politja')).toBeOnTheScreen();
  });

  test('searches by name', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.type(screen.getByLabelText('Cerca'), 'traccio');

    expect(screen.getByText('1 exercici')).toBeOnTheScreen();
    expect(screen.getByText('Tracció al pit')).toBeOnTheScreen();
    expect(screen.queryByText('Esquat amb barra')).not.toBeOnTheScreen();
  });

  test('filters by muscle, and a second tap clears the filter', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);
    const glutes = screen.getByRole('button', { name: 'Glutis' });

    await user.press(glutes);

    expect(glutes).toBeSelected();
    expect(screen.getByText('2 exercicis')).toBeOnTheScreen();
    expect(screen.queryByText('Tracció al pit')).not.toBeOnTheScreen();

    await user.press(glutes);

    expect(screen.getByText('3 exercicis')).toBeOnTheScreen();
  });

  test('only offers chips that would find something', async () => {
    await render(<ExerciseLibrary />);

    expect(screen.getByRole('button', { name: 'Barra' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Trineu' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pit' })).not.toBeOnTheScreen();
  });

  test('explains when nothing matches and clears the filters', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.press(screen.getByRole('button', { name: 'Politja' }));
    await user.press(screen.getByRole('button', { name: 'Glutis' }));

    expect(screen.getByText('Cap exercici coincideix amb la cerca.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Esborra els filtres' }));

    expect(screen.getByText('3 exercicis')).toBeOnTheScreen();
  });
});
