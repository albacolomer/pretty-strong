import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { Exercise } from './exercise';
import { ExerciseLibrary } from './ExerciseLibrary';
import { useExercises } from './useExercises';

jest.mock('./useExercises', () => ({ useExercises: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

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
  builtIn('lying_leg_curl', 'Curl femoral estirat', { primaryMuscles: ['hamstrings'] }),
  builtIn('back_squat', 'Esquat amb barra', {
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    equipment: 'barbell',
  }),
];

beforeEach(() => {
  jest.mocked(router.push).mockReset();
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

    expect(screen.getByText('4 exercicis')).toBeOnTheScreen();
    expect(screen.getByText('Tracció al pit')).toBeOnTheScreen();
    expect(screen.getByText('Dorsals · Politja')).toBeOnTheScreen();
  });

  test('searches by name', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.type(screen.getByLabelText('Cerca'), 'traccio');

    expect(screen.getByText('1 exercici')).toBeOnTheScreen();
    expect(screen.queryByText('Esquat amb barra')).not.toBeOnTheScreen();
  });

  test('picks several muscles in the sheet and shows them on the button', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.press(screen.getByRole('button', { name: 'Tots els músculs' }));
    const glutes = screen.getByRole('checkbox', { name: 'Glutis' });
    await user.press(glutes);
    await user.press(screen.getByRole('checkbox', { name: 'Isquiotibials' }));

    expect(glutes).toBeChecked();
    // Hip thrust, leg curl and squat (glutes as a secondary muscle).
    await user.press(screen.getByRole('button', { name: 'Mostra 3 resultats' }));

    expect(screen.getByRole('button', { name: 'Glutis, Isquiotibials' })).toBeOnTheScreen();
    expect(screen.queryByText('Tracció al pit')).not.toBeOnTheScreen();
  });

  test('only offers options that would find something', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.press(screen.getByRole('button', { name: 'Tot el material' }));

    expect(screen.getByRole('checkbox', { name: 'Barra' })).toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: 'Trineu' })).not.toBeOnTheScreen();
  });

  test('opens the new exercise screen', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.press(screen.getByRole('button', { name: 'Crea un exercici' }));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/plan/exercises/new', params: {} });
  });

  test('offers to create an exercise it could not find, with that name', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.type(screen.getByLabelText('Cerca'), 'Hip thrust unilateral ');
    await user.press(screen.getByRole('button', { name: 'Crea «Hip thrust unilateral»' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/exercises/new',
      params: { name: 'Hip thrust unilateral' },
    });
  });

  test('explains when nothing matches and clears the filters', async () => {
    const user = userEvent.setup();
    await render(<ExerciseLibrary />);

    await user.press(screen.getByRole('button', { name: 'Tot el material' }));
    await user.press(screen.getByRole('checkbox', { name: 'Politja' }));
    await user.press(screen.getByRole('button', { name: 'Mostra 1 resultat' }));
    await user.type(screen.getByLabelText('Cerca'), 'esquat');

    expect(screen.getByText('Cap exercici coincideix amb la cerca.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Esborra els filtres' }));

    expect(screen.getByText('4 exercicis')).toBeOnTheScreen();
  });
});
