import { skipToken, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchProfile } from './api';

// The user id is part of the key, so two accounts never share cached data.
export function profileQueryKey(userId: string | undefined) {
  return ['profile', userId] as const;
}

export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: profileQueryKey(userId),
    // skipToken: don't fetch at all while nobody is signed in.
    queryFn: userId ? () => fetchProfile(userId) : skipToken,
  });
}
