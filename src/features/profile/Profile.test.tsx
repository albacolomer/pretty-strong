import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { ActionSheetIOS } from 'react-native';

import type { HistoryEntry } from '@/features/history/entries';
import { fetchHistoryEntries } from '@/features/history/api';
import { fetchRoutines } from '@/features/routines/api';
import { setAvatar } from '@/features/body/photosApi';
import { upperBody } from '@/features/routines/testData';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchProfile, updateProfileDetails, type Profile } from './api';
import { EditProfile } from './EditProfile';
import { ProfileHeader } from './ProfileHeader';

jest.mock('@/features/schedule/sportsApi', () => ({ fetchWeeklySports: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({ fetchProfile: jest.fn(), updateProfileDetails: jest.fn() }));
jest.mock('@/features/history/api', () => ({ fetchHistoryEntries: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('@/features/workout/api', () => ({ deleteSession: jest.fn() }));
jest.mock('@/features/body/photosApi', () => ({
  SIGNED_URL_SECONDS: 3600,
  fetchProgressPhotos: jest.fn(() => Promise.resolve([])),
  fetchSignedUrls: jest.fn((paths: string[]) =>
    Promise.resolve(Object.fromEntries(paths.map((path) => [path, `https://photos/${path}`]))),
  ),
  addProgressPhoto: jest.fn(() => Promise.resolve()),
  deleteProgressPhoto: jest.fn(() => Promise.resolve()),
  setAvatar: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
// Today is Wednesday 21 October 2026.
jest.mock('@/features/schedule/useToday', () => ({ useToday: () => new Date(2026, 9, 21) }));

const profile: Profile = {
  id: 'user-1',
  username: 'alba',
  language: 'ca',
  created_at: '2026-10-13T10:00:00Z',
  display_name: 'Alba Colomer',
  city: 'Barcelona',
  focus: 'HYROX i força',
  weekly_goal: null,
  avatar_path: null,
  hide_progress_photos: false,
  daily_step_goal: 10000,
};

const workout = (date: string): HistoryEntry => ({
  id: date,
  date,
  routineName: 'Tren superior 1',
  routineLabel: 'strength',
  customLabel: null,
  sport: null,
  sportName: null,
  logMode: 'live',
  durationS: 3600,
  exercises: 4,
  sets: 14,
  volumeKg: 5000,
  distanceM: 0,
  runDistanceM: 0,
  pace: null,
  pending: false,
});

beforeEach(() => {
  jest.mocked(fetchProfile).mockResolvedValue(profile);
  // Planned on Monday, Wednesday, Friday and Saturday: a goal of 4.
  jest.mocked(fetchRoutines).mockResolvedValue([
    { ...upperBody, weekdays: [1, 3] },
    { ...upperBody, id: 'routine-2', weekdays: [3, 5, 6] },
  ]);
  jest.mocked(fetchHistoryEntries).mockResolvedValue(
    [
      // This week: 3 (75% of 4 keeps the streak).
      '2026-10-19', '2026-10-20', '2026-10-21',
      // Last week: 3. The week before: 2, not enough.
      '2026-10-12', '2026-10-14', '2026-10-16',
      '2026-10-06', '2026-10-08',
    ].map(workout),
  );
  jest.mocked(updateProfileDetails).mockReset();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('Profile', () => {
  test('the header: name, city and focus, workouts, streak and this week', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    await render(<ProfileHeader onEdit={onEdit} />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: 'Alba Colomer' })).toBeOnTheScreen();
    expect(screen.getByText('Barcelona · HYROX i força')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Entrenaments: 8')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByLabelText('Aquesta setmana: 3 / 4')).toBeOnTheScreen());
    expect(screen.getByLabelText('Ratxa: 2 setm.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Edita el perfil' }));
    expect(onEdit).toHaveBeenCalled();
  });

  test('the camera badge sets a profile picture, cropped square', async () => {
    const user = userEvent.setup();
    const actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((options, callback) =>
        callback(options.options.indexOf("Tria'n una de la galeria")),
      );
    jest.mocked(launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///me.jpg', width: 800, height: 800, base64: 'SGk=' }],
    });
    await render(<ProfileHeader onEdit={jest.fn()} />, { wrapper: createAppWrapper() });

    // Once the profile is there.
    await screen.findByRole('header', { name: 'Alba Colomer' });
    await user.press(screen.getByRole('button', { name: 'Foto del perfil' }));
    await waitFor(() => expect(setAvatar).toHaveBeenCalledWith('user-1', 'SGk=', null));
    expect(jest.mocked(launchImageLibraryAsync).mock.lastCall?.[0]).toMatchObject({
      allowsEditing: true,
      aspect: [1, 1],
    });
    actionSheet.mockRestore();
  });

  test('without a name, the username', async () => {
    jest.mocked(fetchProfile).mockResolvedValue({ ...profile, display_name: null, city: null, focus: null });
    await render(<ProfileHeader onEdit={jest.fn()} />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: '@alba' })).toBeOnTheScreen();
  });

  test('Edita el perfil: name, city, focus, and goals of your own', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    jest.mocked(updateProfileDetails).mockImplementation((_id, details) =>
      Promise.resolve({ ...profile, ...details }),
    );
    await render(<EditProfile onClose={onClose} />, { wrapper: createAppWrapper() });

    const city = await screen.findByLabelText('Ciutat');
    expect(city.props.value).toBe('Barcelona');
    // From the plan until changed.
    await waitFor(() => expect(screen.getByLabelText('4 entrenaments a la setmana')).toBeOnTheScreen());
    expect(screen.queryByRole('button', { name: /Fes servir els dies planificats/ })).not.toBeOnTheScreen();

    await user.clear(city);
    await user.type(city, 'Girona');
    await user.press(screen.getByRole('button', { name: 'Un entrenament més' }));
    expect(screen.getByLabelText('5 entrenaments a la setmana')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fes servir els dies planificats (4)' })).toBeOnTheScreen();
    // 10.000 steps a day until changed, 500 at a time.
    expect(screen.getByLabelText('10.000 passos al dia')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: '500 passos més' }));
    await user.press(screen.getByRole('button', { name: '500 passos més' }));
    expect(screen.getByLabelText('11.000 passos al dia')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateProfileDetails).toHaveBeenCalledWith('user-1', {
      display_name: 'Alba Colomer',
      city: 'Girona',
      focus: 'HYROX i força',
      weekly_goal: 5,
      daily_step_goal: 11000,
    });
  });

  test('back to the planned days, and empty fields saved as none', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchProfile).mockResolvedValue({ ...profile, weekly_goal: 6 });
    jest.mocked(updateProfileDetails).mockImplementation((_id, details) =>
      Promise.resolve({ ...profile, ...details }),
    );
    await render(<EditProfile onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Fes servir els dies planificats (4)' }));
    await user.clear(screen.getByLabelText('Què entrenes'));
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() =>
      expect(updateProfileDetails).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ focus: null, weekly_goal: null }),
      ),
    );
  });
});
