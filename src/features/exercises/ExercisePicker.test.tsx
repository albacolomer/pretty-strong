import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { createExercise, fetchExercises } from './api';
import type { Exercise } from './exercise';
import { ExercisePicker } from './ExercisePicker';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchExercises: jest.fn(), createExercise: jest.fn() }));
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
    wrapper: createQueryWrapper(),
  });
  // Wait for the library to load.
  await screen.findByRole('checkbox', { name: /Esquat amb barra/ });
}

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExercisePicker />', () => {
  test('adds the ticked exercises in the order they were ticked', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    await renderPicker({ onAdd });

    expect(screen.getByRole('button', { name: 'Afegeix (0)' })).toBeDisabled();

    await user.press(screen.getByRole('checkbox', { name: /Esquat amb barra/ }));
    await user.press(screen.getByRole('checkbox', { name: /Hip thrust amb barra/ }));

    expect(screen.getByRole('checkbox', { name: /Esquat amb barra/ })).toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));

    expect(onAdd).toHaveBeenCalledWith(['back_squat', 'hip_thrust']);
  });

  test('a second tap unticks', async () => {
    const user = userEvent.setup();
    await renderPicker();
    const squat = screen.getByRole('checkbox', { name: /Esquat amb barra/ });

    await user.press(squat);
    await user.press(squat);

    expect(squat).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Afegeix (0)' })).toBeDisabled();
  });

  test('searches like the library, and can be cancelled', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderPicker({ onClose });

    await user.type(screen.getByLabelText('Cerca'), 'esquat');

    expect(screen.queryByRole('checkbox', { name: /Hip thrust/ })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancel·la' }));
    expect(onClose).toHaveBeenCalled();
  });

  test('creates a missing exercise and comes back with it ticked', async () => {
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

    // Tick one first: it stays ticked while creating.
    await user.press(screen.getByRole('checkbox', { name: /Hip thrust amb barra/ }));
    await user.type(screen.getByLabelText('Cerca'), 'Pont de glutis');
    await user.press(screen.getByRole('button', { name: 'Crea «Pont de glutis»' }));

    // The form opens in the sheet, with the searched name.
    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('Pont de glutis');
    await user.press(screen.getByRole('radio', { name: 'Repeticions' }));
    await user.press(screen.getByRole('button', { name: 'Músculs principals' }));
    await user.press(screen.getByLabelText('Glutis'));
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(
      await screen.findByRole('checkbox', { name: /Pont de glutis/ }),
    ).toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));
    expect(onAdd).toHaveBeenCalledWith(['hip_thrust', 'new-1']);
  });

  test('going back to the list drops the new exercise', async () => {
    const user = userEvent.setup();
    await renderPicker();

    await user.press(screen.getByRole('button', { name: 'Crea un exercici' }));
    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('');

    await user.press(screen.getByRole('button', { name: 'Torna a la llista' }));

    expect(screen.getByRole('checkbox', { name: /Esquat amb barra/ })).toBeOnTheScreen();
    expect(mockCreateExercise).not.toHaveBeenCalled();
  });
});
