import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { fetchProfile, type Profile } from './api';
import { useProfile } from './useProfile';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchProfile: jest.fn() }));
const mockUseAuth = jest.mocked(useAuth);
const mockFetchProfile = jest.mocked(fetchProfile);

const profile: Profile = {
  id: 'user-1',
  username: 'alba',
  language: 'ca',
  created_at: '2026-10-13T10:00:00Z',
};

function signedInAs(userId: string | null) {
  const session = userId ? { user: { id: userId } } : null;
  mockUseAuth.mockReturnValue({ session, isLoading: false } as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  mockFetchProfile.mockReset();
});

describe('useProfile', () => {
  test("loads the signed-in user's profile", async () => {
    signedInAs('user-1');
    mockFetchProfile.mockResolvedValue(profile);

    const { result } = await renderHook(() => useProfile(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(profile);
    expect(mockFetchProfile).toHaveBeenCalledWith('user-1');
  });

  test('does not fetch while signed out', async () => {
    signedInAs(null);

    const { result } = await renderHook(() => useProfile(), { wrapper: createQueryWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetchProfile).not.toHaveBeenCalled();
  });
});
