import '@/lib/i18n';

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { authenticateAsync, getEnrolledLevelAsync } from 'expo-local-authentication';

import { fetchProfile, updateHidePhotos, type Profile } from '@/features/profile/api';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { HidePhotosSetting } from './HidePhotosSetting';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('@/features/profile/api', () => ({
  fetchProfile: jest.fn(),
  updateHidePhotos: jest.fn((_id: string, hide: boolean) =>
    Promise.resolve({ hide_progress_photos: hide }),
  ),
}));
jest.mock('expo-local-authentication', () => ({
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  getEnrolledLevelAsync: jest.fn(() => Promise.resolve(1)),
  SecurityLevel: { NONE: 0 },
}));

beforeEach(() => jest.mocked(updateHidePhotos).mockClear());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<HidePhotosSetting />', () => {
  test('turning it on needs no Face ID', async () => {
    jest.mocked(fetchProfile).mockResolvedValue({ hide_progress_photos: false } as Profile);
    await render(<HidePhotosSetting />, { wrapper: createAppWrapper() });

    const toggle = await screen.findByRole('switch', { name: 'Amaga les fotos de progrés' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await fireEvent(toggle, 'valueChange', true);

    await waitFor(() => expect(updateHidePhotos).toHaveBeenCalledWith('user-1', true));
    expect(authenticateAsync).not.toHaveBeenCalled();
  });

  test('without a passcode on the phone, it says what to do', async () => {
    jest.mocked(fetchProfile).mockResolvedValue({ hide_progress_photos: false } as Profile);
    jest.mocked(getEnrolledLevelAsync).mockResolvedValueOnce(0);
    await render(<HidePhotosSetting />, { wrapper: createAppWrapper() });

    const toggle = await screen.findByRole('switch', { name: 'Amaga les fotos de progrés' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await fireEvent(toggle, 'valueChange', true);

    expect(await screen.findByText(/primer posa un codi a l'iPhone/)).toBeOnTheScreen();
    expect(updateHidePhotos).not.toHaveBeenCalled();
  });

  test('turning it off asks for Face ID first', async () => {
    jest.mocked(fetchProfile).mockResolvedValue({ hide_progress_photos: true } as Profile);
    jest.mocked(authenticateAsync).mockResolvedValueOnce({ success: false, error: 'user_cancel' });
    await render(<HidePhotosSetting />, { wrapper: createAppWrapper() });

    const toggle = await screen.findByRole('switch', { name: 'Amaga les fotos de progrés' });
    await waitFor(() => expect(toggle).toBeEnabled());
    await fireEvent(toggle, 'valueChange', false);
    expect(updateHidePhotos).not.toHaveBeenCalled();

    await fireEvent(toggle, 'valueChange', false);
    await waitFor(() => expect(updateHidePhotos).toHaveBeenCalledWith('user-1', false));
  });
});
