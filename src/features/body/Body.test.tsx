import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { launchImageLibraryAsync, requestCameraPermissionsAsync } from 'expo-image-picker';
import { authenticateAsync } from 'expo-local-authentication';
import { ActionSheetIOS } from 'react-native';

import { fetchProfile, type Profile } from '@/features/profile/api';
import { createAppWrapper } from '@/test-utils/appWrapper';

import {
  deleteWeight,
  fetchMeasurements,
  fetchWeights,
  saveMeasurements,
  saveWeight,
} from './api';
import { BodyTab } from './BodyTab';
import { PhotoCompare } from './PhotoCompare';
import { lockPhotos } from './usePhotoLock';
import { addProgressPhoto, deleteProgressPhoto, fetchProgressPhotos } from './photosApi';
import { WeightHistory } from './WeightHistory';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({
  fetchWeights: jest.fn(),
  saveWeight: jest.fn(() => Promise.resolve()),
  deleteWeight: jest.fn(() => Promise.resolve()),
  fetchMeasurements: jest.fn(),
  saveMeasurements: jest.fn(() => Promise.resolve()),
}));
jest.mock('./photosApi', () => ({
  SIGNED_URL_SECONDS: 3600,
  fetchProgressPhotos: jest.fn(() => Promise.resolve([])),
  fetchSignedUrls: jest.fn((paths: string[]) =>
    Promise.resolve(Object.fromEntries(paths.map((path) => [path, `https://photos/${path}`]))),
  ),
  addProgressPhoto: jest.fn(() => Promise.resolve()),
  deleteProgressPhoto: jest.fn(() => Promise.resolve()),
  setAvatar: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/profile/api', () => ({ fetchProfile: jest.fn() }));
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(1)),
  SecurityLevel: { NONE: 0 },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
// Today is Saturday 24 October 2026.
jest.mock('@/features/schedule/useToday', () => ({ useToday: () => new Date(2026, 9, 24) }));

beforeEach(() => {
  jest.mocked(fetchProfile).mockResolvedValue({ hide_progress_photos: false } as Profile);
  lockPhotos();
  jest.mocked(fetchWeights).mockResolvedValue([
    { id: 'w-3', date: '2026-10-24', weightKg: 61.4 },
    { id: 'w-2', date: '2026-10-10', weightKg: 61.8 },
    { id: 'w-1', date: '2026-08-01', weightKg: 62.9 },
  ]);
  jest.mocked(fetchMeasurements).mockResolvedValue([
    { date: '2026-10-02', part: 'waist', customName: null, valueCm: 68 },
    { date: '2026-10-02', part: null, customName: 'Bíceps', valueCm: 31 },
    { date: '2026-09-02', part: 'waist', customName: null, valueCm: 69 },
  ]);
  jest.mocked(saveWeight).mockClear();
  jest.mocked(saveMeasurements).mockClear();
  jest.mocked(deleteWeight).mockClear();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('Body (US-28)', () => {
  test('the latest weight and its change over the range, with the chart', async () => {
    const user = userEvent.setup();
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByLabelText('61,4 kg')).toBeOnTheScreen();
    expect(screen.getByText('−1,5 kg en 3 mesos · registrat avui')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pes de 62,9 a 61,4 kg.')).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: '1M' }));
    expect(screen.getByText('−0,4 kg en 1 mes · registrat avui')).toBeOnTheScreen();
  });

  test('+ Registra el pes saves today’s weight', async () => {
    const user = userEvent.setup();
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: '+ Registra el pes' }));
    const field = screen.getByLabelText('Pes (kg)');
    expect(field.props.placeholder).toBe('61,4');
    await user.type(field, '60,8');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() => expect(saveWeight).toHaveBeenCalledWith('2026-10-24', 60.8));
  });

  test('measurements: the latest of each, with the change since the time before', async () => {
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByLabelText('Cintura, 68,0 cm, −1,0')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pit, –')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bíceps, 31,0 cm')).toBeOnTheScreen();
    expect(screen.getByText('Actualitzat el 2 d’oct. · canvi des del 2 de set.')).toBeOnTheScreen();
  });

  test('Edita saves the ones typed; + Afegeix one of your own', async () => {
    const user = userEvent.setup();
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Edita' }));
    expect(screen.getByLabelText('Cintura (cm)').props.placeholder).toBe('68');
    await user.type(screen.getByLabelText('Cintura (cm)'), '67,5');
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(saveMeasurements).toHaveBeenCalledWith([
        { date: '2026-10-24', part: 'waist', customName: null, valueCm: 67.5 },
      ]),
    );

    await user.press(screen.getByRole('button', { name: '+ Afegeix' }));
    await user.type(screen.getByLabelText('Nom'), 'Bessó');
    await user.type(screen.getByLabelText('Bessó (cm)'), '35');
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(saveMeasurements).toHaveBeenLastCalledWith([
        { date: '2026-10-24', part: null, customName: 'Bessó', valueCm: 35 },
      ]),
    );
  });

  test('the weight history: deleting one goes at once, with Desfés', async () => {
    const user = userEvent.setup();
    const actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(0));
    await render(<WeightHistory />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: '61,8 kg, ds., 10 d’oct.' }));
    await waitFor(() => expect(deleteWeight).toHaveBeenCalledWith('w-2'));
    await user.press(await screen.findByRole('button', { name: 'Desfés' }));
    await waitFor(() => expect(saveWeight).toHaveBeenCalledWith('2026-10-10', 61.8));
    actionSheet.mockRestore();
  });

  describe('progress photos', () => {
    const photos = [
      { id: 'p-2', date: '2026-10-02', storagePath: 'user-1/progress/p-2.jpg' },
      { id: 'p-1', date: '2026-09-02', storagePath: 'user-1/progress/p-1.jpg' },
    ];
    // Each action sheet picks the next of these labels.
    const sheetChoices: string[] = [];
    let actionSheet: jest.SpyInstance;

    beforeEach(() => {
      sheetChoices.length = 0;
      actionSheet = jest
        .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
        .mockImplementation((options, callback) =>
          callback(options.options.indexOf(sheetChoices.shift() ?? '')),
        );
      jest.mocked(fetchProgressPhotos).mockResolvedValue(photos);
      jest.mocked(addProgressPhoto).mockClear();
      jest.mocked(deleteProgressPhoto).mockClear();
    });
    afterEach(() => actionSheet.mockRestore());

    test('newest first; one from the library is dated the day it was taken', async () => {
      const user = userEvent.setup();
      jest.mocked(launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: 'file:///photo.jpg',
            width: 3000,
            height: 4000,
            base64: 'SGk=',
            exif: { '{Exif}': { DateTimeOriginal: '2026:10:20 08:30:00' } },
          },
        ],
      });
      await render(<BodyTab />, { wrapper: createAppWrapper() });

      expect(await screen.findByRole('button', { name: 'Foto del Divendres, 2 d’octubre' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Compara' })).toBeOnTheScreen();

      sheetChoices.push("Tria'n una de la galeria");
      await user.press(screen.getByRole('button', { name: 'Afegeix una foto de progrés' }));
      await waitFor(() => expect(addProgressPhoto).toHaveBeenCalledWith('user-1', '2026-10-20', 'SGk='));
    });

    test('without camera access, it says how to allow it', async () => {
      const user = userEvent.setup();
      jest.mocked(requestCameraPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
      await render(<BodyTab />, { wrapper: createAppWrapper() });

      sheetChoices.push('Fes una foto');
      await user.press(await screen.findByRole('button', { name: 'Afegeix una foto de progrés' }));
      expect(
        await screen.findByText("Per fer fotos, permet l'accés a la càmera a Configuració."),
      ).toBeOnTheScreen();
      expect(addProgressPhoto).not.toHaveBeenCalled();
    });

    test('a photo opens big; deleting it asks first', async () => {
      const user = userEvent.setup();
      await render(<BodyTab />, { wrapper: createAppWrapper() });

      await user.press(await screen.findByRole('button', { name: 'Foto del Dimecres, 2 de setembre' }));
      expect(screen.getByRole('header', { name: 'Dimecres, 2 de setembre' })).toBeOnTheScreen();
      sheetChoices.push('Esborra la foto');
      await user.press(screen.getByRole('button', { name: 'Esborra la foto' }));

      expect(actionSheet.mock.lastCall?.[0].title).toBe('Esborrar aquesta foto? No es podrà recuperar.');
      await waitFor(() => expect(deleteProgressPhoto).toHaveBeenCalledWith(photos[1]));
    });

    test('hidden: blurred until Face ID unlocks them; a failed try leaves them hidden', async () => {
      const user = userEvent.setup();
      jest.mocked(fetchProfile).mockResolvedValue({ hide_progress_photos: true } as Profile);
      jest.mocked(authenticateAsync).mockResolvedValueOnce({ success: false, error: 'user_cancel' });
      await render(<BodyTab />, { wrapper: createAppWrapper() });

      const hidden = await screen.findByRole('button', { name: 'Foto amagada del Divendres, 2 d’octubre' });
      await user.press(hidden);
      expect(authenticateAsync).toHaveBeenLastCalledWith({
        promptMessage: 'Desbloqueja les fotos de progrés',
        cancelLabel: 'Cancel·la',
      });
      expect(screen.queryByRole('header', { name: 'Divendres, 2 d’octubre' })).not.toBeOnTheScreen();

      // Face ID this time: the photo opens, and they all show.
      await user.press(hidden);
      expect(await screen.findByRole('header', { name: 'Divendres, 2 d’octubre' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Foto del Divendres, 2 d’octubre' })).toBeOnTheScreen();
    });

    test('hidden: Desbloqueja shows them all at once', async () => {
      const user = userEvent.setup();
      jest.mocked(fetchProfile).mockResolvedValue({ hide_progress_photos: true } as Profile);
      await render(<BodyTab />, { wrapper: createAppWrapper() });

      await user.press(await screen.findByRole('button', { name: 'Desbloqueja' }));
      expect(await screen.findByRole('button', { name: 'Foto del Dimecres, 2 de setembre' })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Desbloqueja' })).not.toBeOnTheScreen();
    });

    test('Compara: the oldest and the newest; tap a side, then a photo', async () => {
      const user = userEvent.setup();
      jest.mocked(fetchProgressPhotos).mockResolvedValue([
        { id: 'p-3', date: '2026-10-20', storagePath: 'user-1/progress/p-3.jpg' },
        ...photos,
      ]);
      await render(<PhotoCompare />, { wrapper: createAppWrapper() });

      expect(await screen.findByRole('radio', { name: 'Abans: 2 de setembre del 2026' })).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: 'Després: 20 d’octubre del 2026' })).toBeChecked();

      await user.press(screen.getByRole('radio', { name: 'Abans: 2 de setembre del 2026' }));
      await user.press(screen.getByRole('button', { name: 'Posa la foto del 2 d’octubre del 2026' }));
      expect(screen.getByRole('radio', { name: 'Abans: 2 d’octubre del 2026' })).toBeChecked();
    });
  });
});
