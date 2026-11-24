import { AuthApiError } from '@supabase/supabase-js';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { menus } from '@/components/ui';
import { changePassword, signOut } from '@/features/auth/api';
import { setAppLanguage } from '@/lib/i18n';
import { METRIC_UNITS } from '@/lib/units';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchProfile, updateProfileDetails, updateProfileLanguage, type Profile } from './api';
import { Settings } from './Settings';
import { useUnitsStore } from './useUnits';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-1', email: 'alba@gmail.com' } },
    isLoading: false,
  }),
}));
jest.mock('@/features/auth/api', () => ({
  changePassword: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
}));
jest.mock('./api', () => ({
  fetchProfile: jest.fn(),
  updateProfileDetails: jest.fn(),
  updateProfileLanguage: jest.fn(),
  updateHidePhotos: jest.fn(),
}));

const profile = {
  id: 'user-1',
  username: 'alba',
  language: 'ca',
  hide_progress_photos: false,
  weight_unit: 'kg',
  length_unit: 'cm',
  distance_unit: 'km',
} as Profile;

// Each native action sheet picks the next of these labels.
const choices: string[] = [];
let actionSheet: jest.SpyInstance;

beforeEach(() => {
  jest.mocked(fetchProfile).mockResolvedValue(profile);
  jest
    .mocked(updateProfileDetails)
    .mockReset()
    .mockImplementation((_id, details) => Promise.resolve({ ...profile, ...details }));
  jest
    .mocked(updateProfileLanguage)
    .mockReset()
    .mockImplementation((_id, language) => Promise.resolve({ ...profile, language }));
  jest.mocked(changePassword).mockReset().mockResolvedValue();
  useUnitsStore.setState({ units: METRIC_UNITS });
  choices.length = 0;
  actionSheet = jest
    .spyOn(menus, 'show')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(choices.shift() ?? '')),
    );
});

afterEach(async () => {
  actionSheet.mockRestore();
  await setAppLanguage('ca');
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<Settings />', () => {
  test('account, preferences and privacy, each in its own card', async () => {
    await render(<Settings />, { wrapper: createAppWrapper() });

    expect(screen.getByRole('header', { name: 'Compte' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Preferències' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Privadesa' })).toBeOnTheScreen();
    expect(screen.getByText('alba@gmail.com')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Canvia la contrasenya' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Idioma, Català' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pes, kg' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Mides, cm' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Distància, km' })).toBeOnTheScreen();
    expect(
      await screen.findByRole('switch', { name: 'Amaga les fotos de progrés' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Exercise data by RepDB (repdb.co)')).toBeOnTheScreen();
  });

  test('a unit is used at once, on the phone too, and saved to the profile', async () => {
    const user = userEvent.setup();
    await render(<Settings />, { wrapper: createAppWrapper() });

    choices.push('Lliures (lb)');
    await user.press(screen.getByRole('button', { name: 'Pes, kg' }));

    expect(useUnitsStore.getState().units).toEqual({ ...METRIC_UNITS, weight: 'lb' });
    expect(screen.getByRole('button', { name: 'Pes, lb' })).toBeOnTheScreen();
    await waitFor(() =>
      expect(updateProfileDetails).toHaveBeenCalledWith('user-1', {
        weight_unit: 'lb',
        length_unit: 'cm',
        distance_unit: 'km',
      }),
    );
  });

  test('a unit that fails to save goes back', async () => {
    const user = userEvent.setup();
    jest.mocked(updateProfileDetails).mockRejectedValue(new Error('Database error'));
    await render(<Settings />, { wrapper: createAppWrapper() });

    choices.push('Milles (mi)');
    await user.press(screen.getByRole('button', { name: 'Distància, km' }));

    await waitFor(() => expect(useUnitsStore.getState().units).toEqual(METRIC_UNITS));
    expect(await screen.findByText(/No s'ha pogut desar el perfil/)).toBeOnTheScreen();
  });

  test('the language switches straight away and is saved to the profile', async () => {
    const user = userEvent.setup();
    await render(<Settings />, { wrapper: createAppWrapper() });

    choices.push('English');
    await user.press(screen.getByRole('button', { name: 'Idioma, Català' }));

    expect(await screen.findByRole('header', { name: 'Account' })).toBeOnTheScreen();
    await waitFor(() => expect(updateProfileLanguage).toHaveBeenCalledWith('user-1', 'en'));
  });

  test('Canvia la contrasenya: the current one first; a wrong one says so', async () => {
    const user = userEvent.setup();
    jest
      .mocked(changePassword)
      .mockRejectedValueOnce(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'));
    await render(<Settings />, { wrapper: createAppWrapper() });

    await user.press(screen.getByRole('button', { name: 'Canvia la contrasenya' }));
    const save = screen.getByRole('button', { name: 'Desa' });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('Contrasenya actual'), 'wrong');
    await user.type(screen.getByLabelText('Contrasenya nova'), 'short');
    // Too short yet.
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('Contrasenya nova'), 'er123');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(changePassword).toHaveBeenCalledWith('alba@gmail.com', 'wrong', 'shorter123');
    expect(await screen.findByText('La contrasenya actual no és correcta.')).toBeOnTheScreen();

    await user.clear(screen.getByLabelText('Contrasenya actual'));
    await user.type(screen.getByLabelText('Contrasenya actual'), 'secret123');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(changePassword).toHaveBeenLastCalledWith('alba@gmail.com', 'secret123', 'shorter123');
    expect(await screen.findByText('Contrasenya canviada ✓')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Contrasenya actual')).toBeNull();
  });

  test('Tanca la sessió signs out', async () => {
    const user = userEvent.setup();
    await render(<Settings />, { wrapper: createAppWrapper() });

    await user.press(screen.getByRole('button', { name: 'Tanca la sessió' }));
    expect(signOut).toHaveBeenCalled();
  });
});
