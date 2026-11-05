import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchExerciseSettings, saveExerciseSettings } from './api';
import type { Exercise } from './exercise';
import { ExerciseVideo } from './ExerciseVideo';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchExerciseSettings: jest.fn(), saveExerciseSettings: jest.fn() }));
const mockFetch = jest.mocked(fetchExerciseSettings);
const mockSave = jest.mocked(saveExerciseSettings);

const SUGGESTED = 'https://www.tiktok.com/@coach/video/1';
const YOURS = 'https://www.youtube.com/shorts/abc';

const hipThrust: Exercise = {
  id: 'hip_thrust',
  slug: 'hip_thrust',
  names: { ca: 'Hip thrust amb barra', es: 'Hip thrust con barra', en: 'Barbell hip thrust' },
  name: null,
  trackingType: 'weight_reps',
  primaryMuscles: ['glutes'],
  secondaryMuscles: [],
  equipment: 'barbell',
  isUnilateral: false,
  videoUrl: SUGGESTED,
  photoPath: null,
  technique: null,
};
const custom: Exercise = { ...hipThrust, id: 'custom-1', slug: null, names: null, name: 'El meu' };

function yourLink(videoUrl: string) {
  mockFetch.mockResolvedValue({ hip_thrust: { notes: null, defaultRestS: null, videoUrl } });
}

async function renderVideo(exercise: Exercise) {
  await render(<ExerciseVideo exercise={exercise} />, { wrapper: createAppWrapper() });
}

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  mockFetch.mockReset().mockResolvedValue({});
  mockSave.mockReset().mockResolvedValue();
});

describe('<ExerciseVideo />', () => {
  test('opens the suggested video where it lives', async () => {
    const user = userEvent.setup();
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await renderVideo(hipThrust);

    await user.press(
      await screen.findByRole('button', { name: 'Mira el vídeo de tècnica a tiktok.com' }),
    );

    expect(openURL).toHaveBeenCalledWith(SUGGESTED);
    openURL.mockRestore();
  });

  test('your own link replaces the suggested one, and only you get it', async () => {
    const user = userEvent.setup();
    await renderVideo(hipThrust);

    await user.press(await screen.findByRole('button', { name: 'Canvia el vídeo' }));
    await user.clear(screen.getByLabelText('Vídeo de tècnica'));
    await user.type(screen.getByLabelText('Vídeo de tècnica'), YOURS);
    await user.press(screen.getByRole('button', { name: 'Fet' }));

    expect(mockSave).toHaveBeenCalledWith('user-1', 'hip_thrust', { videoUrl: YOURS });
    expect(
      await screen.findByRole('button', { name: 'Mira el vídeo de tècnica a youtube.com' }),
    ).toBeOnTheScreen();
  });

  test('something that is not a link is refused', async () => {
    const user = userEvent.setup();
    await renderVideo(hipThrust);

    await user.press(await screen.findByRole('button', { name: 'Canvia el vídeo' }));
    await user.clear(screen.getByLabelText('Vídeo de tècnica'));
    await user.type(screen.getByLabelText('Vídeo de tècnica'), 'tiktok');
    await user.press(screen.getByRole('button', { name: 'Fet' }));

    expect(
      screen.getByText("Enganxa l'enllaç sencer, que comenci per https://."),
    ).toBeOnTheScreen();
    expect(mockSave).not.toHaveBeenCalled();
  });

  test('goes back to the suggested video', async () => {
    const user = userEvent.setup();
    yourLink(YOURS);
    await renderVideo(hipThrust);

    await user.press(await screen.findByRole('button', { name: 'Torna al vídeo recomanat' }));

    expect(mockSave).toHaveBeenCalledWith('user-1', 'hip_thrust', { videoUrl: null });
    expect(
      await screen.findByRole('button', { name: 'Mira el vídeo de tècnica a tiktok.com' }),
    ).toBeOnTheScreen();
  });

  test('emptying the link, with no suggested video, leaves you with none', async () => {
    const user = userEvent.setup();
    yourLink(YOURS);
    await renderVideo({ ...hipThrust, videoUrl: null });

    await user.press(await screen.findByRole('button', { name: 'Canvia el vídeo' }));
    await user.clear(screen.getByLabelText('Vídeo de tècnica'));
    await user.press(screen.getByRole('button', { name: 'Fet' }));

    expect(mockSave).toHaveBeenCalledWith('user-1', 'hip_thrust', { videoUrl: null });
    expect(await screen.findByRole('button', { name: 'Afegeix un vídeo' })).toBeOnTheScreen();
  });

  test('your own exercises change their link in the form, not here', async () => {
    await renderVideo(custom);

    expect(
      await screen.findByRole('button', { name: 'Mira el vídeo de tècnica a tiktok.com' }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Canvia el vídeo' })).not.toBeOnTheScreen();
  });
});
