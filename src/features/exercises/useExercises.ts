import { skipToken, useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchExercises } from './api';

// The user id is in the key because custom exercises are per user.
export function exercisesQueryKey(userId: string | undefined) {
  return ['exercises', userId] as const;
}

// Loads the whole library once; searching then happens on the phone.
export function useExercises() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: exercisesQueryKey(userId),
    queryFn: userId ? fetchExercises : skipToken,
    // The library rarely changes, so don't refetch it every time a screen opens.
    staleTime: 60 * 60 * 1000,
  });
}
