import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchRoutines, saveRoutine, type SaveRoutineInput } from './api';

export function routinesQueryKey(userId: string | undefined) {
  return ['routines', userId] as const;
}

export function useRoutines() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: routinesQueryKey(userId),
    queryFn: userId ? fetchRoutines : skipToken,
  });
}

// Saves a routine, then reloads the list so it shows what the database now
// holds (including ids given to new exercises).
export function useSaveRoutine() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: (input: SaveRoutineInput) => saveRoutine(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: routinesQueryKey(session?.user.id), exact: true }),
  });
}
