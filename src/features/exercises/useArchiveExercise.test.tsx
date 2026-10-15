import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/lib/i18n';

import { ToastProvider } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

import { setExerciseArchived } from './api';
import type { Exercise } from './exercise';
import {
  archivedExercisesQueryKey,
  useArchiveExercise,
  useRestoreExercise,
} from './useArchiveExercise';
import { exercisesQueryKey } from './useExercises';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ setExerciseArchived: jest.fn() }));
const mockSetArchived = jest.mocked(setExerciseArchived);

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

const active = exercisesQueryKey('user-1');
const archived = archivedExercisesQueryKey('user-1');
const ids = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryData<Exercise[]>(key)?.map((e) => e.id);

// Our own client (not createQueryWrapper) so the tests can read its cache.
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  client.setQueryData(active, [exercise('a'), exercise('b')]);
  client.setQueryData(archived, [exercise('old')]);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  mockSetArchived.mockReset();
});

describe('useArchiveExercise', () => {
  test('takes the exercise out of the library at once, then lists it as archived', async () => {
    let finishSaving: (value: Exercise) => void = () => {};
    mockSetArchived.mockReturnValue(new Promise((resolve) => (finishSaving = resolve)));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useArchiveExercise(), { wrapper });

    result.current.mutate('a');

    // Gone before the server has answered.
    await waitFor(() => expect(ids(client, active)).toEqual(['b']));
    expect(mockSetArchived).toHaveBeenCalledWith('a', true);

    finishSaving(exercise('a'));

    await waitFor(() => expect(ids(client, archived)).toEqual(['a', 'old']));
  });

  test('puts it back if saving fails', async () => {
    mockSetArchived.mockRejectedValue(new TypeError('Network request failed'));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useArchiveExercise(), { wrapper });

    result.current.mutate('a');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(ids(client, active)).toEqual(['a', 'b']);
  });
});

describe('useRestoreExercise', () => {
  test('moves the exercise from archived back into the library', async () => {
    mockSetArchived.mockResolvedValue(exercise('old'));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => useRestoreExercise(), { wrapper });

    result.current.mutate('old');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetArchived).toHaveBeenCalledWith('old', false);
    expect(ids(client, archived)).toEqual([]);
    expect(ids(client, active)).toEqual(['a', 'b', 'old']);
  });
});
