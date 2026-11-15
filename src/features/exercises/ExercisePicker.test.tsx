import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { menus } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { createExercise, fetchExercises } from './api';
import type { Exercise } from './exercise';
import { ExercisePicker } from './ExercisePicker';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  fetchExercises: jest.fn(),
  createExercise: jest.fn(),
  fetchExerciseSettings: jest.fn(() => Promise.resolve({})),
}));
const mockCreateExercise = jest.mocked(createExercise);

function builtIn(id: string, ca: string): Exercise {
  return {
    id,
    slug: id,
    names: { ca, es: ca, en: ca },
    name: null,
    trackingType: 'weight_reps',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    equipment: 'barbell',
    isUnilateral: false,
    videoUrl: null,
    photoPath: null,
    technique: null,
  };
}

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest
    .mocked(fetchExercises)
    .mockResolvedValue([
      builtIn('hip_thrust', 'Hip thrust amb barra'),
      builtIn('back_squat', 'Esquat amb barra'),
    ]);
  mockCreateExercise.mockReset();
});

async function renderPicker(props: Partial<Parameters<typeof ExercisePicker>[0]> = {}) {
  await render(<ExercisePicker visible onClose={jest.fn()} onAdd={jest.fn()} {...props} />, {
    wrapper: createAppWrapper(),
  });
  // Wait for the library to load.
  await screen.findByRole(props.single ? 'checkbox' : 'button', { name: /^Esquat amb barra/ });
}

// A library row while adding: a tap adds it once more. (Anchored, so it
// isn't the strip's "Treu «…»".)
const row = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) });

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExercisePicker />', () => {
  test('adds the picked exercises in the order they were picked', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    await renderPicker({ onAdd });

    expect(screen.getByRole('button', { name: 'Afegeix (0)' })).toBeDisabled();

    await user.press(row('Esquat amb barra'));
    await user.press(row('Hip thrust amb barra'));

    expect(screen.getAllByLabelText('Afegit')).toHaveLength(2);
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));

    expect(onAdd).toHaveBeenCalledWith(['back_squat', 'hip_thrust']);
  });

  test('a second tap adds it again, e.g. HYROX runs between stations (US-07)', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    await renderPicker({ onAdd });

    await user.press(row('Esquat amb barra'));
    await user.press(row('Hip thrust amb barra'));
    await user.press(row('Esquat amb barra'));

    expect(screen.getByLabelText('Afegit 2 cops')).toBeOnTheScreen();
    // The strip lists them in order.
    expect(
      screen.getByRole('button', { name: 'Treu «Esquat amb barra», el número 3' }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Afegeix (3)' }));

    expect(onAdd).toHaveBeenCalledWith(['back_squat', 'hip_thrust', 'back_squat']);
  });

  test('the strip takes out one pick, and only that one', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    await renderPicker({ onAdd });

    await user.press(row('Esquat amb barra'));
    await user.press(row('Hip thrust amb barra'));
    await user.press(row('Esquat amb barra'));
    await user.press(screen.getByRole('button', { name: 'Treu «Esquat amb barra», el número 1' }));

    // The other one moves up to number 2.
    expect(
      screen.getByRole('button', { name: 'Treu «Esquat amb barra», el número 2' }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));

    expect(onAdd).toHaveBeenCalledWith(['hip_thrust', 'back_squat']);
  });

  test('swapping picks one, and a second tap unticks', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    await renderPicker({ onAdd, single: true });
    const squat = screen.getByRole('checkbox', { name: /Esquat amb barra/ });
    const hipThrust = screen.getByRole('checkbox', { name: /Hip thrust amb barra/ });

    await user.press(squat);
    await user.press(squat);
    expect(squat).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Canvia' })).toBeDisabled();

    await user.press(squat);
    await user.press(hipThrust);
    expect(squat).not.toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Canvia' }));

    expect(onAdd).toHaveBeenCalledWith(['hip_thrust']);
  });

  test('searches like the library, and can be cancelled', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderPicker({ onClose });

    await user.type(screen.getByLabelText('Cerca'), 'esquat');

    expect(screen.queryByRole('button', { name: /^Hip thrust/ })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancel·la' }));
    expect(onClose).toHaveBeenCalled();
  });

  test('creates a missing exercise and comes back with it picked', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    mockCreateExercise.mockResolvedValue({
      ...builtIn('new-1', ''),
      slug: null,
      names: null,
      name: 'Pont de glutis',
      trackingType: 'bodyweight_reps',
      equipment: 'none',
    });
    await renderPicker({ onAdd });

    // Pick one first: it stays picked while creating.
    await user.press(row('Hip thrust amb barra'));
    await user.type(screen.getByLabelText('Cerca'), 'Pont de glutis');
    await user.press(screen.getByRole('button', { name: 'Crea «Pont de glutis»' }));

    // The form opens in the sheet, with the searched name.
    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('Pont de glutis');
    // "Canvia" opens the list of tracking types.
    const actionSheet = jest
      .spyOn(menus, 'show')
      .mockImplementation((options, callback) => callback(options.options.indexOf('Repeticions')));
    await user.press(screen.getByRole('button', { name: 'Què registraràs: Pes i repeticions' }));
    actionSheet.mockRestore();
    await user.press(screen.getByRole('button', { name: /^Músculs principals/ }));
    await user.press(screen.getByLabelText('Glutis'));
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(
      await screen.findByRole('button', { name: 'Treu «Pont de glutis», el número 2' }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));
    expect(onAdd).toHaveBeenCalledWith(['hip_thrust', 'new-1']);
  });

  test('going back to the list drops the new exercise', async () => {
    const user = userEvent.setup();
    await renderPicker();

    await user.press(screen.getByRole('button', { name: 'Crea un exercici' }));
    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('');

    await user.press(screen.getByRole('button', { name: 'Torna a la llista' }));

    expect(row('Esquat amb barra')).toBeOnTheScreen();
    expect(mockCreateExercise).not.toHaveBeenCalled();
  });
});
