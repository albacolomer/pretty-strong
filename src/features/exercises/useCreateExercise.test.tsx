import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { createExercise } from './api';
import type { Exercise } from './exercise';
import { useCreateExercise } from './useCreateExercise';
import { exercisesQueryKey } from './useExercises';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ createExercise: jest.fn() }));

function exercise(id: string): Exercise {
  return {
    id,
    slug: null,
    names: null,
    name: id,
    trackingType: 'weight_reps',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    equipment: 'barbell',
    isUnilateral: false,
  };
}

test('adds the saved exercise to the cached library', async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(createExercise).mockResolvedValue(exercise('new'));
  // Our own client (not createQueryWrapper) so the test can read its cache.
  const client = new QueryClient({ defaultOptions: { mutations: { gcTime: Infinity } } });
  client.setQueryData(exercisesQueryKey('user-1'), [exercise('existing')]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const { result } = await renderHook(() => useCreateExercise(), { wrapper });
  result.current.mutate({
    name: 'new',
    trackingType: 'weight_reps',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    equipment: 'barbell',
    isUnilateral: false,
  });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(createExercise).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'user-1' }));
  expect(client.getQueryData<Exercise[]>(exercisesQueryKey('user-1'))?.map((e) => e.id)).toEqual([
    'existing',
    'new',
  ]);
});
