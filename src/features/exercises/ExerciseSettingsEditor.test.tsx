import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchExerciseSettings, saveExerciseSettings } from './api';
import { ExerciseSettingsEditor } from './ExerciseSettingsEditor';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchExerciseSettings: jest.fn(), saveExerciseSettings: jest.fn() }));
const mockFetch = jest.mocked(fetchExerciseSettings);
const mockSave = jest.mocked(saveExerciseSettings);

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  mockFetch.mockReset().mockResolvedValue({});
  mockSave.mockReset().mockResolvedValue();
});

async function renderEditor() {
  await render(<ExerciseSettingsEditor exerciseId="hip_thrust" />, {
    wrapper: createAppWrapper(),
  });
  // Wait for the saved settings to load.
  await screen.findByText('Descans per defecte');
}

type User = ReturnType<typeof userEvent.setup>;

async function openRest(user: User, time: string) {
  await user.press(screen.getByRole('button', { name: `Descans per defecte, ${time}` }));
}

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExerciseSettingsEditor />', () => {
  test('starts from the app default and saves each ±15 s change', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await openRest(user, '1:30');
    expect(screen.getByLabelText('Descans per defecte: 1:30')).toBeOnTheScreen();
    expect(screen.getByText("Fa servir el de l'app (1:30).")).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: '+15 s' }));

    expect(mockSave).toHaveBeenCalledWith('user-1', 'hip_thrust', { defaultRestS: 105 });
    expect(screen.getByLabelText('Descans per defecte: 1:45')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(screen.getByRole('button', { name: 'Descans per defecte, 1:45' })).toBeOnTheScreen();
  });

  test('picks a preset, and can go back to the app default', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({ hip_thrust: { notes: null, defaultRestS: 120, videoUrl: null } });
    await renderEditor();

    await openRest(user, '2:00');
    expect(screen.getByRole('radio', { name: '2:00' })).toBeChecked();

    await user.press(screen.getByRole('radio', { name: '3:00' }));
    expect(mockSave).toHaveBeenLastCalledWith('user-1', 'hip_thrust', { defaultRestS: 180 });

    await user.press(screen.getByRole('button', { name: "Usa el de l'app" }));
    expect(mockSave).toHaveBeenLastCalledWith('user-1', 'hip_thrust', { defaultRestS: null });
  });

  test('saves the notes with Fet, and only if they changed', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.press(screen.getByRole('button', { name: 'Les teves notes' }));
    await user.type(screen.getByPlaceholderText('P. ex. seient al 4, peus amples'), '  Seient al 4 ');
    await user.press(screen.getByRole('button', { name: 'Fet' }));

    expect(mockSave).toHaveBeenCalledWith('user-1', 'hip_thrust', { notes: 'Seient al 4' });

    mockSave.mockClear();
    await user.press(screen.getByRole('button', { name: 'Les teves notes, Seient al 4' }));
    await user.press(screen.getByRole('button', { name: 'Fet' }));

    expect(mockSave).not.toHaveBeenCalled();
  });

  test('Cancel·la leaves the notes as they were', async () => {
    const user = userEvent.setup();
    await renderEditor();

    await user.press(screen.getByRole('button', { name: 'Les teves notes' }));
    await user.type(screen.getByPlaceholderText('P. ex. seient al 4, peus amples'), 'Peus amples');
    await user.press(screen.getByRole('button', { name: 'Cancel·la' }));

    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Les teves notes' })).toBeOnTheScreen();
  });

  test('goes back to the saved value and says so when saving fails', async () => {
    const user = userEvent.setup();
    mockSave.mockRejectedValue(new TypeError('Network request failed'));
    await renderEditor();

    await openRest(user, '1:30');
    await user.press(screen.getByRole('button', { name: '−15 s' }));

    expect(
      await screen.findByText("No s'ha pogut desar. Torna-ho a provar."),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Descans per defecte: 1:30')).toBeOnTheScreen();
  });
});
