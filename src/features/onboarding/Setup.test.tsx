import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { isUsernameAvailable } from '@/features/auth/api';
import { saveMeasurements, saveWeight } from '@/features/body/api';
import { fetchProfile, updateProfileDetails, type Profile } from '@/features/profile/api';
import { useUnitsStore } from '@/features/profile/useUnits';
import { METRIC_UNITS } from '@/lib/units';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { Setup } from './Setup';
import { useSetupStore } from './setupStore';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1', email: 'alba@gmail.com' } }, isLoading: false }),
}));
jest.mock('@/features/auth/api', () => ({ isUsernameAvailable: jest.fn() }));
jest.mock('@/features/profile/api', () => ({
  fetchProfile: jest.fn(),
  updateProfileDetails: jest.fn(),
}));
jest.mock('@/features/body/api', () => ({
  saveWeight: jest.fn(() => Promise.resolve()),
  saveMeasurements: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/body/photosApi', () => ({
  SIGNED_URL_SECONDS: 3600,
  fetchSignedUrls: jest.fn(() => Promise.resolve({})),
  setAvatar: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
// Today is Wednesday 21 October 2026.
jest.mock('@/features/schedule/useToday', () => ({ useToday: () => new Date(2026, 9, 21) }));

const mockIsUsernameAvailable = jest.mocked(isUsernameAvailable);
const mockFetchProfile = jest.mocked(fetchProfile);
const mockUpdateProfile = jest.mocked(updateProfileDetails);
const mockSaveWeight = jest.mocked(saveWeight);
const mockSaveMeasurements = jest.mocked(saveMeasurements);

// A brand-new account: only the username and the defaults.
const newProfile: Profile = {
  id: 'user-1',
  username: 'alba',
  language: 'ca',
  created_at: '2026-10-21T10:00:00Z',
  display_name: null,
  city: null,
  bio: null,
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

let saved: Profile;

beforeEach(() => {
  saved = { ...newProfile };
  mockFetchProfile.mockReset().mockImplementation(() => Promise.resolve(saved));
  mockUpdateProfile.mockReset().mockImplementation((_userId, details) => {
    saved = { ...saved, ...details };
    return Promise.resolve(saved);
  });
  mockIsUsernameAvailable.mockReset().mockResolvedValue(true);
  mockSaveWeight.mockClear();
  mockSaveMeasurements.mockClear();
  useUnitsStore.setState({ units: METRIC_UNITS });
  useSetupStore.getState().begin('alba@gmail.com');
});

afterEach(() => useSetupStore.getState().finish());

const continueButton = () => screen.getByRole('button', { name: 'Continua' });

describe('<Setup />', () => {
  test('asks each question in turn, saving what is filled in, then opens the app', async () => {
    const user = userEvent.setup();
    await render(<Setup />, { wrapper: createAppWrapper() });

    // 1. Name.
    expect(screen.getByText('Pas 1 de 6')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Com et diuen?' })).toBeOnTheScreen();
    // The username made from the email at sign-up, kept as it is.
    expect(await screen.findByDisplayValue('alba')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Nom'), 'Alba Colomer');
    await user.press(continueButton());
    expect(mockUpdateProfile).toHaveBeenLastCalledWith('user-1', { display_name: 'Alba Colomer' });
    expect(mockIsUsernameAvailable).not.toHaveBeenCalled();

    // 2. About you.
    expect(await screen.findByText('Pas 2 de 6')).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Dona' }));
    await user.press(continueButton());
    expect(mockUpdateProfile).toHaveBeenLastCalledWith('user-1', { gender: 'female' });

    // 3. Units: pounds from now on.
    expect(await screen.findByText('Pas 3 de 6')).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'lb' }));
    await user.press(continueButton());
    expect(mockUpdateProfile).toHaveBeenLastCalledWith('user-1', {
      weight_unit: 'lb',
      length_unit: 'cm',
      distance_unit: 'km',
    });
    expect(useUnitsStore.getState().units.weight).toBe('lb');

    // 4. Weight, typed in lb and kept in kg.
    expect(await screen.findByText('Pas 4 de 6')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Pes (lb)'), '150');
    await user.press(continueButton());
    expect(mockSaveWeight).toHaveBeenCalledWith('2026-10-21', 68);

    // 5. Measurements, skipped.
    expect(await screen.findByText('Pas 5 de 6')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Omet' }));
    expect(mockSaveMeasurements).not.toHaveBeenCalled();

    // 6. Goals.
    expect(await screen.findByText('Pas 6 de 6')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Un entrenament més' }));
    await user.press(continueButton());
    expect(mockUpdateProfile).toHaveBeenLastCalledWith('user-1', {
      weekly_goal: 4,
      daily_step_goal: 10000,
    });

    // All set: the first name, and into the app.
    expect(await screen.findByRole('header', { name: 'Tot a punt, Alba!' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Som-hi' }));
    expect(useSetupStore.getState().pending).toBeNull();
  });

  test('a new username is checked first, and a taken one stays on the step', async () => {
    const user = userEvent.setup();
    mockIsUsernameAvailable.mockResolvedValue(false);
    await render(<Setup />, { wrapper: createAppWrapper() });

    const field = await screen.findByDisplayValue('alba');
    await user.clear(field);
    await user.type(field, 'Alba_Strong');
    await user.press(continueButton());

    expect(mockIsUsernameAvailable).toHaveBeenCalledWith('alba_strong');
    expect(await screen.findByText("Aquest nom d'usuari ja està agafat.")).toBeOnTheScreen();
    expect(screen.getByText('Pas 1 de 6')).toBeOnTheScreen();
    expect(mockUpdateProfile).not.toHaveBeenCalled();

    mockIsUsernameAvailable.mockResolvedValue(true);
    await user.press(continueButton());
    expect(mockUpdateProfile).toHaveBeenLastCalledWith('user-1', { username: 'alba_strong' });
    expect(await screen.findByText('Pas 2 de 6')).toBeOnTheScreen();
  });

  test('skipping saves nothing', async () => {
    const user = userEvent.setup();
    await render(<Setup />, { wrapper: createAppWrapper() });

    await user.type(screen.getByLabelText('Nom'), 'Alba');
    await user.press(screen.getByRole('button', { name: 'Omet' }));

    expect(await screen.findByText('Pas 2 de 6')).toBeOnTheScreen();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  test('saves only the measurements typed, and holds back one the database refuses', async () => {
    const user = userEvent.setup();
    useSetupStore.getState().goTo(4);
    await render(<Setup />, { wrapper: createAppWrapper() });

    await user.type(screen.getByLabelText('Cintura (cm)'), '0');
    expect(continueButton()).toBeDisabled();
    expect(screen.getByText('Les mesures han de ser entre 1 i 300 cm.')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Cintura (cm)'));
    await user.type(screen.getByLabelText('Cintura (cm)'), '68,5');
    await user.press(continueButton());

    expect(mockSaveMeasurements).toHaveBeenCalledWith([
      { date: '2026-10-21', part: 'waist', customName: null, valueCm: 68.5 },
    ]);
  });

  test('comes back to the step it was on, and ‹ goes back one', async () => {
    const user = userEvent.setup();
    useSetupStore.getState().goTo(3);
    await render(<Setup />, { wrapper: createAppWrapper() });

    expect(screen.getByRole('header', { name: 'Quant peses?' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Enrere' }));

    expect(await screen.findByRole('header', { name: 'Les teves unitats' })).toBeOnTheScreen();
    expect(useSetupStore.getState().pending?.step).toBe(2);
  });

  test('has no ‹ on the first step: the account is already made', async () => {
    await render(<Setup />, { wrapper: createAppWrapper() });

    expect(screen.queryByRole('button', { name: 'Enrere' })).toBeNull();
  });
});
