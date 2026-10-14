import '@/lib/i18n';

import { act, render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ActionSheetIOS } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchArchivedExercises, setExerciseArchived } from './api';
import type { Exercise } from './exercise';
import { ExerciseLibrary } from './ExerciseLibrary';
import { useExercises } from './useExercises';

// Fake only the library data; keep the real query keys.
jest.mock('./useExercises', () => ({
  ...jest.requireActual('./useExercises'),
  useExercises: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchArchivedExercises: jest.fn(), setExerciseArchived: jest.fn() }));
const mockSetArchived = jest.mocked(setExerciseArchived);

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

const custom: Exercise = {
  ...builtIn('x', '', { primaryMuscles: ['chest'], equipment: 'dumbbell' }),
  id: 'custom-1',
  slug: null,
  names: null,
  name: 'Mi press',
};

function libraryShows(list: Exercise[]) {
  jest
    .mocked(useExercises)
    .mockReturnValue({ data: list, isPending: false, isError: false } as ReturnType<
      typeof useExercises
    >);
}

beforeEach(() => {
  jest.mocked(router.push).mockReset();
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(fetchArchivedExercises).mockResolvedValue([]);
  mockSetArchived.mockReset();
  libraryShows(exercises);
});

// The archived-exercises query answers just after the first render; let it
// land inside act() so React doesn't warn about an update outside a test step.
async function renderLibrary() {
  await render(<ExerciseLibrary />, { wrapper: createAppWrapper() });
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExerciseLibrary />', () => {
  test('lists every exercise with its muscles and equipment', async () => {
    await renderLibrary();

    expect(screen.getByText('4 exercicis')).toBeOnTheScreen();
    expect(screen.getByText('Tracció al pit')).toBeOnTheScreen();
    expect(screen.getByText('Dorsals · Politja')).toBeOnTheScreen();
  });

  test('searches by name', async () => {
    const user = userEvent.setup();
    await renderLibrary();

    await user.type(screen.getByLabelText('Cerca'), 'traccio');

    expect(screen.getByText('1 exercici')).toBeOnTheScreen();
    expect(screen.queryByText('Esquat amb barra')).not.toBeOnTheScreen();
  });

  test('picks several muscles in the sheet and shows them on the button', async () => {
    const user = userEvent.setup();
    await renderLibrary();

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
    await renderLibrary();

    await user.press(screen.getByRole('button', { name: 'Tot el material' }));

    expect(screen.getByRole('checkbox', { name: 'Barra' })).toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: 'Trineu' })).not.toBeOnTheScreen();
  });

  test('only your own exercises have the ⋯ menu', async () => {
    libraryShows([...exercises, custom]);
    await renderLibrary();

    expect(screen.getByRole('button', { name: 'Opcions de «Mi press»' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Opcions de «Tracció/ })).not.toBeOnTheScreen();
  });

  test('archives from the menu, with an undo toast', async () => {
    const user = userEvent.setup();
    libraryShows([...exercises, custom]);
    mockSetArchived.mockResolvedValue(custom);
    // Pretend the user taps "Arxiva" (option 0) in the native action sheet.
    const actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(0));
    await renderLibrary();

    await user.press(screen.getByRole('button', { name: 'Opcions de «Mi press»' }));

    expect(actionSheet).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Mi press', options: ['Arxiva', 'Cancel·la'] }),
      expect.any(Function),
    );
    expect(mockSetArchived).toHaveBeenCalledWith('custom-1', true);
    expect(await screen.findByText("S'ha arxivat «Mi press»")).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));

    expect(mockSetArchived).toHaveBeenLastCalledWith('custom-1', false);
    actionSheet.mockRestore();
  });

  test('links to the archived exercises when there are any', async () => {
    jest.mocked(fetchArchivedExercises).mockResolvedValue([custom]);
    await renderLibrary();

    const user = userEvent.setup();
    await user.press(await screen.findByRole('button', { name: 'Exercicis arxivats (1)' }));

    expect(router.push).toHaveBeenCalledWith('/plan/exercises/archived');
  });

  test('opens the new exercise screen', async () => {
    const user = userEvent.setup();
    await renderLibrary();

    await user.press(screen.getByRole('button', { name: 'Crea un exercici' }));

    expect(router.push).toHaveBeenCalledWith({ pathname: '/plan/exercises/new', params: {} });
  });

  test('offers to create an exercise it could not find, with that name', async () => {
    const user = userEvent.setup();
    await renderLibrary();

    await user.type(screen.getByLabelText('Cerca'), 'Hip thrust unilateral ');
    await user.press(screen.getByRole('button', { name: 'Crea «Hip thrust unilateral»' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/exercises/new',
      params: { name: 'Hip thrust unilateral' },
    });
  });

  test('explains when nothing matches and clears the filters', async () => {
    const user = userEvent.setup();
    await renderLibrary();

    await user.press(screen.getByRole('button', { name: 'Tot el material' }));
    await user.press(screen.getByRole('checkbox', { name: 'Politja' }));
    await user.press(screen.getByRole('button', { name: 'Mostra 1 resultat' }));
    await user.type(screen.getByLabelText('Cerca'), 'esquat');

    expect(screen.getByText('Cap exercici coincideix amb la cerca.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Esborra els filtres' }));

    expect(screen.getByText('4 exercicis')).toBeOnTheScreen();
  });
});
