import '@/lib/i18n';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { menus } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import {
  createExercise,
  fetchExerciseSettings,
  saveExerciseSettings,
  updateExercise,
} from './api';
import type { Exercise } from './exercise';
import { ExerciseForm } from './ExerciseForm';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  createExercise: jest.fn(),
  updateExercise: jest.fn(),
  fetchExerciseSettings: jest.fn(),
  saveExerciseSettings: jest.fn(() => Promise.resolve()),
}));
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
  videoUrl: null,
};

// Each native action sheet (the list of tracking types) picks the next of
// these labels, or is cancelled when there's none.
const sheetChoices: string[] = [];
let actionSheet: jest.SpyInstance;

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  mockCreateExercise.mockReset();
  jest.mocked(saveExerciseSettings).mockClear();
  jest.mocked(fetchExerciseSettings).mockResolvedValue({});
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(menus, 'show')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

type User = ReturnType<typeof userEvent.setup>;

// Opens a row's list, taps the given options, then "Fet". Rows are named
// by their label and value, e.g. "Material, Sense material".
async function pick(user: User, row: RegExp, options: string[]) {
  await user.press(screen.getByRole('button', { name: row }));
  for (const option of options) {
    await user.press(screen.getByLabelText(option));
  }
  await user.press(screen.getByRole('button', { name: 'Fet' }));
}

// Picks a tracking type from the list "Canvia" opens.
async function chooseTrackingType(user: User, current: string, type: string) {
  sheetChoices.push(type);
  await user.press(screen.getByRole('button', { name: `Què registraràs: ${current}` }));
}

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExerciseForm />', () => {
  test('starts with no equipment, shows what is missing and does not save', async () => {
    const user = userEvent.setup();
    await render(<ExerciseForm onSaved={jest.fn()} />, { wrapper: createAppWrapper() });

    expect(screen.getByRole('button', { name: 'Material, Sense material' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(screen.getByText('Aquest camp és obligatori.')).toBeOnTheScreen();
    expect(screen.getByText('Tria almenys un múscul principal.')).toBeOnTheScreen();
    expect(mockCreateExercise).not.toHaveBeenCalled();
  });

  test('a run can be saved without muscles or equipment', async () => {
    const user = userEvent.setup();
    mockCreateExercise.mockResolvedValue({ ...saved, trackingType: 'run' });
    await render(<ExerciseForm initialName="Cursa de muntanya" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    await chooseTrackingType(user, 'Pes i repeticions', 'Córrer');

    expect(screen.getByRole('button', { name: 'Músculs principals, Opcional' })).toBeOnTheScreen();

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
      wrapper: createAppWrapper(),
    });

    expect(screen.getByLabelText('Nom')).toHaveDisplayValue('Hip thrust unilateral');

    await chooseTrackingType(user, 'Pes i repeticions', 'Temps');
    expect(screen.getByRole('button', { name: 'Què registraràs: Temps' })).toBeOnTheScreen();
    await pick(user, /^Músculs principals/, ['Glutis', 'Isquiotibials']);

    // A main muscle isn't offered again as a secondary one.
    await user.press(screen.getByRole('button', { name: 'Secundaris, Opcional' }));
    expect(screen.queryByRole('checkbox', { name: 'Glutis' })).not.toBeOnTheScreen();
    await user.press(screen.getByLabelText('Bessons'));
    await user.press(screen.getByRole('button', { name: 'Fet' }));

    await pick(user, /^Material/, ['Barra']);
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
      videoUrl: null,
    });
    expect(onSaved).toHaveBeenCalledWith(saved);
    // No note was written, so none is saved.
    expect(saveExerciseSettings).not.toHaveBeenCalled();
  });

  test('a technique video link and a note are saved with the exercise', async () => {
    const user = userEvent.setup();
    mockCreateExercise.mockResolvedValue(saved);
    await render(<ExerciseForm initialName="Press inclinat" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    await pick(user, /^Músculs principals/, ['Pit']);

    // Something that isn't a link is refused in the sheet.
    await user.press(screen.getByRole('button', { name: 'Vídeo de tècnica, Opcional' }));
    await user.type(screen.getByLabelText('Vídeo de tècnica'), 'youtube');
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(
      screen.getByText("Enganxa l'enllaç sencer, que comenci per https://."),
    ).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Vídeo de tècnica'));
    await user.type(screen.getByLabelText('Vídeo de tècnica'), ' https://www.youtube.com/watch?v=abc ');
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    // The row shows the site, not the whole link.
    expect(screen.getByRole('button', { name: 'Vídeo de tècnica, youtube.com' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Nota, Opcional' }));
    await user.type(screen.getByLabelText('Les teves notes'), 'Banc a 30°');
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(screen.getByRole('button', { name: 'Nota, Banc a 30°' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(mockCreateExercise).toHaveBeenCalledWith(
      expect.objectContaining({ videoUrl: 'https://www.youtube.com/watch?v=abc' }),
    );
    // The note goes with your settings for the exercise just created.
    await waitFor(() =>
      expect(saveExerciseSettings).toHaveBeenCalledWith('user-1', 'new-1', { notes: 'Banc a 30°' }),
    );
  });

  test('edits one of your exercises, starting from what is saved', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    const updated = { ...saved, name: 'Hip thrust a una cama' };
    jest.mocked(updateExercise).mockResolvedValue(updated);
    jest.mocked(fetchExerciseSettings).mockResolvedValue({
      'new-1': { notes: 'Peus amples', defaultRestS: null },
    });
    await render(<ExerciseForm exercise={saved} onSaved={onSaved} />, {
      wrapper: createAppWrapper(),
    });

    const name = screen.getByLabelText('Nom');
    expect(name).toHaveDisplayValue('Hip thrust unilateral');
    expect(screen.getByRole('button', { name: 'Què registraràs: Temps' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Músculs principals, Glutis, Isquiotibials' }),
    ).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Nota, Peus amples' })).toBeOnTheScreen();

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
      videoUrl: null,
    });
    expect(mockCreateExercise).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(updated);
    // The note wasn't touched, so it isn't saved again.
    expect(saveExerciseSettings).not.toHaveBeenCalled();
  });

  test('explains a name you already use', async () => {
    const user = userEvent.setup();
    mockCreateExercise.mockRejectedValue({ code: '23505', message: 'duplicate key value' });
    await render(<ExerciseForm initialName="Press raro" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    await pick(user, /^Músculs principals/, ['Pit']);
    await pick(user, /^Material/, ['Manuelles']);
    await user.press(screen.getByRole('button', { name: "Desa l'exercici" }));

    expect(await screen.findByText('Ja tens un exercici amb aquest nom.')).toBeOnTheScreen();
  });
});
