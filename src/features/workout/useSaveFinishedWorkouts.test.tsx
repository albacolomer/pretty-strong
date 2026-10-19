import '@/lib/i18n';

import { act, renderHook, screen, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { upperBody } from '@/features/routines/testData';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { workoutFromRoutine, type FinishedWorkout } from './activeWorkout';
import { finishWorkout } from './api';
import { useSaveFinishedWorkouts } from './useSaveFinishedWorkouts';
import { useWorkoutStore } from './workoutStore';

jest.mock('./api', () => ({ finishWorkout: jest.fn() }));
const mockFinishWorkout = jest.mocked(finishWorkout);

let ids = 0;
const finished = (): FinishedWorkout => ({
  ...workoutFromRoutine(upperBody, {
    date: '2026-10-20',
    plannedRoutineId: 'routine-1',
    changeReason: null,
    startedAt: '2026-10-20T17:00:00.000Z',
    newId: () => `id-${(ids += 1)}`,
  }),
  endedAt: '2026-10-20T18:00:00.000Z',
});

// Lets a test bring the app back to the front.
let appStateListener: ((state: AppStateStatus) => void) | null = null;

beforeEach(() => {
  mockFinishWorkout.mockReset();
  appStateListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
});

afterEach(() => jest.restoreAllMocks());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('useSaveFinishedWorkouts', () => {
  test('saves a finished workout, then lets it go from the phone', async () => {
    const workout = finished();
    useWorkoutStore.setState({ active: null, pending: [workout] });
    mockFinishWorkout.mockResolvedValue();

    await renderHook(() => useSaveFinishedWorkouts(), { wrapper: createAppWrapper() });

    expect(mockFinishWorkout).toHaveBeenCalledWith(workout);
    await waitFor(() => expect(useWorkoutStore.getState().pending).toEqual([]));
    expect(await screen.findByText('Entrenament desat ✓')).toBeOnTheScreen();
  });

  test('with no signal it waits on the phone, and tries again when the app comes back', async () => {
    const workout = finished();
    useWorkoutStore.setState({ active: null, pending: [workout] });
    mockFinishWorkout.mockRejectedValueOnce({ message: 'TypeError: Network request failed' });

    await renderHook(() => useSaveFinishedWorkouts(), { wrapper: createAppWrapper() });

    expect(await screen.findByText("Sense connexió: es desarà quan n'hi hagi.")).toBeOnTheScreen();
    expect(useWorkoutStore.getState().pending).toHaveLength(1);

    mockFinishWorkout.mockResolvedValue();
    await act(async () => appStateListener?.('active'));

    expect(mockFinishWorkout).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(useWorkoutStore.getState().pending).toEqual([]));
  });
});
