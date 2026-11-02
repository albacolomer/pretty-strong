import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Pedometer } from 'expo-sensors';
import { AppState, type AppStateStatus } from 'react-native';

import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { saveDailySteps } from './api';
import { useSaveDailySteps } from './useSaveDailySteps';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({ saveDailySteps: jest.fn() }));
jest.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: jest.fn(),
    getPermissionsAsync: jest.fn(),
    getStepCountAsync: jest.fn(),
  },
}));

const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };
const notAsked = { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' };

// Lets a test bring the app back to the front.
let appStateListener: ((state: AppStateStatus) => void) | null = null;

// Lets the save in progress finish.
const settle = () => act(() => new Promise<void>((resolve) => setImmediate(resolve)));

beforeEach(() => {
  // Monday 2 November 2026, 9:40; only the date is faked.
  jest.useFakeTimers({
    now: new Date(2026, 10, 2, 9, 40),
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
  jest.clearAllMocks();
  jest.mocked(saveDailySteps).mockResolvedValue();
  jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(granted as never);
  // 1.000 steps on the 27th, 2.000 on the 28th… and none on the 31st.
  jest
    .mocked(Pedometer.getStepCountAsync)
    .mockImplementation((start) =>
      Promise.resolve({ steps: start.getDate() === 31 ? 0 : (start.getDate() % 26) * 1000 }),
    );
  appStateListener = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useSaveDailySteps', () => {
  test("saves the 7 days the phone keeps, leaving out days with no steps", async () => {
    await renderHook(() => useSaveDailySteps(), { wrapper: createQueryWrapper() });

    await waitFor(() =>
      expect(saveDailySteps).toHaveBeenCalledWith([
        { date: '2026-10-27', steps: 1000 },
        { date: '2026-10-28', steps: 2000 },
        { date: '2026-10-29', steps: 3000 },
        { date: '2026-10-30', steps: 4000 },
        { date: '2026-11-01', steps: 1000 },
        { date: '2026-11-02', steps: 2000 },
      ]),
    );
    // Today until now.
    expect(Pedometer.getStepCountAsync).toHaveBeenCalledWith(
      new Date(2026, 10, 2),
      new Date(2026, 10, 2, 9, 40),
    );
  });

  test('saves again when the app comes back to the front', async () => {
    await renderHook(() => useSaveDailySteps(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(saveDailySteps).toHaveBeenCalledTimes(1));
    await settle();

    await act(() => appStateListener?.('active'));
    await waitFor(() => expect(saveDailySteps).toHaveBeenCalledTimes(2));
  });

  test('without Motion & Fitness it reads nothing and never asks', async () => {
    jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(notAsked as never);
    await renderHook(() => useSaveDailySteps(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(Pedometer.getPermissionsAsync).toHaveBeenCalled());
    expect(Pedometer.getStepCountAsync).not.toHaveBeenCalled();
    expect(saveDailySteps).not.toHaveBeenCalled();
  });

  test('with no signal it stays quiet and tries again next time', async () => {
    jest.mocked(saveDailySteps).mockRejectedValueOnce({ message: 'TypeError: Network request failed' });
    await renderHook(() => useSaveDailySteps(), { wrapper: createQueryWrapper() });
    await waitFor(() => expect(saveDailySteps).toHaveBeenCalledTimes(1));
    await settle();

    await act(() => appStateListener?.('active'));
    await waitFor(() => expect(saveDailySteps).toHaveBeenCalledTimes(2));
  });
});
