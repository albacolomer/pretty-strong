import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { appLanguage, setAppLanguage } from '@/lib/i18n';

import { updateProfileLanguage, type Profile } from './api';
import { LanguagePicker } from './LanguagePicker';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ updateProfileLanguage: jest.fn() }));
const mockUpdateProfileLanguage = jest.mocked(updateProfileLanguage);

function createQueryWrapper() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const savedProfile = (language: Profile['language']): Profile => ({
  id: 'user-1',
  username: 'alba',
  language,
  created_at: '2026-10-13T10:00:00Z',
});

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  mockUpdateProfileLanguage.mockReset();
});

afterEach(async () => {
  await setAppLanguage('ca');
  localStorage.clear();
});

describe('<LanguagePicker />', () => {
  test('switches the app and saves the language to the profile', async () => {
    const user = userEvent.setup();
    mockUpdateProfileLanguage.mockResolvedValue(savedProfile('es'));
    await render(<LanguagePicker />, { wrapper: createQueryWrapper() });

    await user.press(screen.getByRole('radio', { name: 'Español' }));

    expect(appLanguage()).toBe('es');
    expect(localStorage.getItem('language')).toBe('es');
    expect(mockUpdateProfileLanguage).toHaveBeenCalledWith('user-1', 'es');
    // The label is now in Spanish too.
    expect(await screen.findByRole('radio', { name: 'Español' })).toBeChecked();
  });

  test('goes back to the previous language when saving fails', async () => {
    const user = userEvent.setup();
    mockUpdateProfileLanguage.mockRejectedValue(new TypeError('Network request failed'));
    await render(<LanguagePicker />, { wrapper: createQueryWrapper() });

    await user.press(screen.getByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "No s'ha pogut desar l'idioma. Torna-ho a provar.",
    );
    expect(appLanguage()).toBe('ca');
    expect(screen.getByRole('radio', { name: 'Català' })).toBeChecked();
  });
});
