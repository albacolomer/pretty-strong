import { renderHook, waitFor } from '@testing-library/react-native';

import { appLanguage, setAppLanguage } from '@/lib/i18n';

import type { Profile } from './api';
import { useProfile } from './useProfile';
import { useSyncProfileLanguage } from './useSyncProfileLanguage';

jest.mock('./useProfile', () => ({ useProfile: jest.fn() }));
const mockUseProfile = jest.mocked(useProfile);

function profileLanguageIs(language: Profile['language'] | undefined) {
  const data = language ? { language } : undefined;
  mockUseProfile.mockReturnValue({ data } as ReturnType<typeof useProfile>);
}

afterEach(async () => {
  await setAppLanguage('ca');
  localStorage.clear();
});

describe('useSyncProfileLanguage', () => {
  test("switches the app to the profile's language", async () => {
    profileLanguageIs('es');

    await renderHook(() => useSyncProfileLanguage());

    await waitFor(() => expect(appLanguage()).toBe('es'));
    expect(localStorage.getItem('language')).toBe('es');
  });

  test('leaves the language alone while the profile is loading', async () => {
    await setAppLanguage('en');
    profileLanguageIs(undefined);

    await renderHook(() => useSyncProfileLanguage());

    expect(appLanguage()).toBe('en');
  });
});
