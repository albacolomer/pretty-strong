import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { menus } from '@/components/ui';
import type { HistoryEntry } from '@/features/history/entries';
import { fetchHistoryEntries } from '@/features/history/api';
import { fetchRoutines } from '@/features/routines/api';
import { setAvatar } from '@/features/body/photosApi';
import { upperBody } from '@/features/routines/testData';
import { METRIC_UNITS } from '@/lib/units';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchProfile, updateProfileDetails, type Profile } from './api';
import { EditProfile } from './EditProfile';
import { ProfileHeader } from './ProfileHeader';
import { useSyncProfileUnits, useUnitsStore } from './useUnits';

// The tabs layout's sync, which keeps your saved units on the phone.
function SyncUnits() {
  useSyncProfileUnits();
  return null;
}

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
// iOS's date wheels: one tap picks 20 November 1996.
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');
  return function DateWheels({ onChange }: { onChange: (event: unknown, date: Date) => void }) {
    return createElement(Pressable, {
      role: 'button',
      'aria-label': '20 de novembre de 1996',
      onPress: () => onChange({ type: 'set' }, new Date(1996, 10, 20)),
    });
  };
});
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
  bio: 'HYROX i força',
  gender: null,
  birth_date: null,
  weekly_goal: null,
  avatar_path: null,
  hide_progress_photos: false,
  daily_step_goal: 10000,
  weight_unit: 'kg',
  length_unit: 'cm',
  distance_unit: 'km',
};

const workout = (date: string): HistoryEntry => ({
  id: date,
  date,
  routineName: 'Tren superior 1',
  routineId: 'upper',
  routineLabel: 'strength',
  customLabel: null,
  sport: null,
  sportName: null,
  eventKind: null,
  eventName: null,
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
  test('the header: name, city and bio, workouts, streak and this week', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    await render(<ProfileHeader onEdit={onEdit} />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: 'Alba Colomer' })).toBeOnTheScreen();
    expect(screen.getByText('Barcelona')).toBeOnTheScreen();
    expect(screen.getByText('HYROX i força')).toBeOnTheScreen();
    expect(await screen.findByLabelText('Entrenaments: 8')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByLabelText('Aquesta setmana: 3 / 4')).toBeOnTheScreen());
    expect(screen.getByLabelText('Ratxa: 2 setm.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Edita el perfil' }));
    expect(onEdit).toHaveBeenCalled();
  });

  test('the camera badge sets a profile picture, cropped square', async () => {
    const user = userEvent.setup();
    const actionSheet = jest
      .spyOn(menus, 'show')
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
    jest.mocked(fetchProfile).mockResolvedValue({ ...profile, display_name: null, city: null, bio: null });
    await render(<ProfileHeader onEdit={jest.fn()} />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: '@alba' })).toBeOnTheScreen();
  });

  test('Edita el perfil: about you and your goals, saved together with Desa', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const actionSheet = jest
      .spyOn(menus, 'show')
      .mockImplementation((options, callback) => callback(options.options.indexOf('Dona')));
    jest.mocked(updateProfileDetails).mockImplementation((_id, details) =>
      Promise.resolve({ ...profile, ...details }),
    );
    await render(<EditProfile onClose={onClose} />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Ciutat, Barcelona' }));
    await user.clear(screen.getByLabelText('Ciutat'));
    await user.type(screen.getByLabelText('Ciutat'), 'Girona');
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(screen.getByRole('button', { name: 'Ciutat, Girona' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Gènere, Opcional' }));
    expect(screen.getByRole('button', { name: 'Gènere, Dona' })).toBeOnTheScreen();

    // Today is 21 October 2026: not 30 until November.
    await user.press(screen.getByRole('button', { name: 'Edat, Opcional' }));
    await user.press(screen.getByRole('button', { name: '20 de novembre de 1996' }));
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(screen.getByRole('button', { name: 'Edat, 29 anys' })).toBeOnTheScreen();

    // From the plan until changed.
    await waitFor(() => expect(screen.getByLabelText('4 entrenaments a la setmana')).toBeOnTheScreen());
    expect(screen.queryByRole('button', { name: /Fes servir els dies planificats/ })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Un entrenament més' }));
    expect(screen.getByLabelText('5 entrenaments a la setmana')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Fes servir els dies planificats (4)' })).toBeOnTheScreen();
    // 10.000 steps a day until changed, 500 at a time.
    expect(screen.getByLabelText('10.000 passos al dia')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: '500 passos més' }));
    await user.press(screen.getByRole('button', { name: '500 passos més' }));
    expect(screen.getByLabelText('11.000 passos al dia')).toBeOnTheScreen();

    // Nothing is saved until Desa.
    expect(updateProfileDetails).not.toHaveBeenCalled();
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateProfileDetails).toHaveBeenCalledWith('user-1', {
      display_name: 'Alba Colomer',
      bio: 'HYROX i força',
      city: 'Girona',
      gender: 'female',
      birth_date: '1996-11-20',
      weekly_goal: 5,
      daily_step_goal: 11000,
      weight_unit: 'kg',
      length_unit: 'cm',
      distance_unit: 'km',
    });
    actionSheet.mockRestore();
  });

  test('back to the planned days, and empty fields saved as none', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchProfile).mockResolvedValue({
      ...profile,
      weekly_goal: 6,
      gender: 'female',
      birth_date: '1996-11-20',
    });
    const actionSheet = jest
      .spyOn(menus, 'show')
      .mockImplementation((options, callback) =>
        callback(options.options.indexOf('Prefereixo no dir-ho')),
      );
    jest.mocked(updateProfileDetails).mockImplementation((_id, details) =>
      Promise.resolve({ ...profile, ...details }),
    );
    await render(<EditProfile onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Fes servir els dies planificats (4)' }));
    await user.press(screen.getByRole('button', { name: 'Bio, HYROX i força' }));
    await user.clear(screen.getByLabelText('Bio'));
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    await user.press(screen.getByRole('button', { name: 'Gènere, Dona' }));
    await user.press(screen.getByRole('button', { name: 'Edat, 29 anys' }));
    await user.press(screen.getByRole('button', { name: 'Treu la data' }));
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() =>
      expect(updateProfileDetails).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ bio: null, gender: null, birth_date: null, weekly_goal: null }),
      ),
    );
    actionSheet.mockRestore();
  });

  test('units: pounds, inches and miles, saved with Desa and kept on the phone', async () => {
    const user = userEvent.setup();
    const choices = ['Lliures (lb)', 'Polzades (in)', 'Milles (mi)'];
    const actionSheet = jest
      .spyOn(menus, 'show')
      .mockImplementation((options, callback) =>
        callback(options.options.indexOf(choices.shift() ?? '')),
      );
    jest.mocked(updateProfileDetails).mockImplementation((_id, details) =>
      Promise.resolve({ ...profile, ...details }),
    );
    await render(
      <>
        <SyncUnits />
        <EditProfile onClose={jest.fn()} />
      </>,
      { wrapper: createAppWrapper() },
    );

    await user.press(await screen.findByRole('button', { name: 'Pes, kg' }));
    await user.press(screen.getByRole('button', { name: 'Mides, cm' }));
    await user.press(screen.getByRole('button', { name: 'Distància, km' }));
    expect(screen.getByRole('button', { name: 'Pes, lb' })).toBeOnTheScreen();
    // Nothing changes on the phone until it's saved.
    expect(useUnitsStore.getState().units).toEqual(METRIC_UNITS);

    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() =>
      expect(updateProfileDetails).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ weight_unit: 'lb', length_unit: 'in', distance_unit: 'mi' }),
      ),
    );
    await waitFor(() =>
      expect(useUnitsStore.getState().units).toEqual({ weight: 'lb', length: 'in', distance: 'mi' }),
    );
    actionSheet.mockRestore();
    useUnitsStore.setState({ units: METRIC_UNITS });
  });

  test('Cancel·la in a sheet keeps what was there', async () => {
    const user = userEvent.setup();
    await render(<EditProfile onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Nom, Alba Colomer' }));
    await user.type(screen.getByLabelText('Nom'), ' Soler');
    // The sheet's, over the form's own.
    await user.press(screen.getAllByRole('button', { name: 'Cancel·la' }).at(-1)!);

    expect(screen.getByRole('button', { name: 'Nom, Alba Colomer' })).toBeOnTheScreen();
  });
});
