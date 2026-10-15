import '@/lib/i18n';

import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { createExercise, updateExercise } from './api';
import type { Exercise } from './exercise';
import { ExerciseForm } from './ExerciseForm';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ createExercise: jest.fn(), updateExercise: jest.fn() }));
const mockCreateExercise = jest.mocked(createExercise);

const saved: Exercise = {
  id: 'new-1',
  slug: null,
  names: null,
  name: 'Hip thrust unilateral',
  trackingType: 'duration',
  primaryMuscles: ['glutes', 'hamstrings'],
  secondaryMuscles: ['calves'],
  equipment: 'barbell',
  isUnilateral: true,
};

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  mockCreateExercise.mockReset();
});

// Opens a picker field, taps the given options, then "Fet".
async function pick(user: ReturnType<typeof userEvent.setup>, field: string, options: string[]) {
  await user.press(screen.getByRole('button', { name: field }));
  for (const option of options) {
    await user.press(screen.getByLabelText(option));
  }
  await user.press(screen.getByRole('button', { name: 'Fet' }));
}

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExerciseForm />', () => {
  test('starts with no equipment, shows what is missing and does not save', async () => {
    const user = userEvent.setup();
    await render(<ExerciseForm onSaved={jest.fn()} />, { wrapper: createQueryWrapper() });

    expect(screen.getByRole('button', { name: 'Material' })).toHaveTextContent(/Sense material/);

    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(screen.getByText('Aquest camp és obligatori.')).toBeOnTheScreen();
    expect(screen.getByText('Tria almenys un múscul principal.')).toBeOnTheScreen();
    expect(mockCreateExercise).not.toHaveBeenCalled();
  });

  test('a run can be saved without muscles or equipment', async () => {
    const user = userEvent.setup();
    mockCreateExercise.mockResolvedValue({ ...saved, trackingType: 'run' });
    await render(<ExerciseForm initialName="Cursa de muntanya" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    await user.press(screen.getByRole('radio', { name: 'Córrer' }));

    expect(screen.getByRole('button', { name: 'Músculs principals (opcional)' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(mockCreateExercise).toHaveBeenCalledWith(
      expect.objectContaining({ trackingType: 'run', primaryMuscles: [], equipment: 'none' }),
    );
  });

  test('saves a complete exercise and reports it', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    mockCreateExercise.mockResolvedValue(saved);
    await render(<ExerciseForm initialName="Hip thrust unilateral" onSaved={onSaved} />, {
      wrapper: createQueryWrapper(),
    });

    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('Hip thrust unilateral');
    expect(screen.getByRole('radio', { name: 'Pes i repeticions' })).toBeChecked();

    await user.press(screen.getByRole('radio', { name: 'Temps' }));
    await pick(user, 'Músculs principals', ['Glutis', 'Isquiotibials']);

    // A main muscle isn't offered again as a secondary one.
    await user.press(screen.getByRole('button', { name: 'Músculs secundaris (opcional)' }));
    expect(screen.queryByRole('checkbox', { name: 'Glutis' })).not.toBeOnTheScreen();
    await user.press(screen.getByLabelText('Bessons'));
    await user.press(screen.getByRole('button', { name: 'Fet' }));

    await pick(user, 'Material', ['Barra']);
    await fireEvent(screen.getByRole('switch', { name: 'Un costat cada vegada' }), 'valueChange', true);
    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(mockCreateExercise).toHaveBeenCalledWith({
      ownerId: 'user-1',
      name: 'Hip thrust unilateral',
      trackingType: 'duration',
      primaryMuscles: ['glutes', 'hamstrings'],
      secondaryMuscles: ['calves'],
      equipment: 'barbell',
      isUnilateral: true,
    });
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  test('edits one of your exercises, starting from what is saved', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    const updated = { ...saved, name: 'Hip thrust a una cama' };
    jest.mocked(updateExercise).mockResolvedValue(updated);
    await render(<ExerciseForm exercise={saved} onSaved={onSaved} />, {
      wrapper: createQueryWrapper(),
    });

    const name = screen.getByLabelText('Nom');
    expect(name).toHaveDisplayValue('Hip thrust unilateral');
    expect(screen.getByRole('radio', { name: 'Temps' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Músculs principals' })).toHaveTextContent(
      /Glutis, Isquiotibials/,
    );

    await user.clear(name);
    await user.type(name, 'Hip thrust a una cama');
    await user.press(screen.getByRole('button', { name: 'Desa els canvis' }));

    expect(updateExercise).toHaveBeenCalledWith('new-1', {
      name: 'Hip thrust a una cama',
      trackingType: 'duration',
      primaryMuscles: ['glutes', 'hamstrings'],
      secondaryMuscles: ['calves'],
      equipment: 'barbell',
      isUnilateral: true,
    });
    expect(mockCreateExercise).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(updated);
  });

  test('explains a name you already use', async () => {
    const user = userEvent.setup();
    mockCreateExercise.mockRejectedValue({ code: '23505', message: 'duplicate key value' });
    await render(<ExerciseForm initialName="Press raro" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    await pick(user, 'Músculs principals', ['Pit']);
    await pick(user, 'Material', ['Manuelles']);
    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(await screen.findByText('Ja tens un exercici amb aquest nom.')).toBeOnTheScreen();
  });
});
