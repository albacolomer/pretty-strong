import '@/lib/i18n';

import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { Pedometer } from 'expo-sensors';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import { fetchProfile, type Profile } from '@/features/profile/api';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { StepsCard } from './StepsCard';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('@/features/profile/api', () => ({ fetchProfile: jest.fn() }));
jest.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getStepCountAsync: jest.fn(),
    watchStepCount: jest.fn(),
  },
}));

const today = new Date(2026, 9, 27);
const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };
const notAsked = { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' };
const refused = { granted: false, canAskAgain: false, status: 'denied', expires: 'never' };

// What the phone counted before, and a way to send it new steps.
let newSteps: (steps: number) => void = () => {};
const stopWatching = jest.fn();

beforeEach(() => {
  jest.mocked(fetchProfile).mockResolvedValue({ daily_step_goal: 10000 } as Profile);
  jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(true);
  jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(granted as never);
  jest.mocked(Pedometer.requestPermissionsAsync).mockResolvedValue(granted as never);
  jest.mocked(Pedometer.getStepCountAsync).mockResolvedValue({ steps: 6240 });
  jest.mocked(Pedometer.watchStepCount).mockImplementation((callback) => {
    newSteps = (steps) => callback({ steps });
    return { remove: stopWatching };
  });
  stopWatching.mockClear();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<StepsCard />', () => {
  test("today's steps against the goal, counting as you walk", async () => {
    await render(<StepsCard today={today} />, { wrapper: createAppWrapper() });

    expect(await screen.findByLabelText('6.240 / 10.000 passos')).toBeOnTheScreen();
    expect(screen.getByText('3.760 per arribar')).toBeOnTheScreen();
    expect(screen.getByText(/^62\s%$/)).toBeOnTheScreen();
    // Counted from midnight.
    expect(Pedometer.getStepCountAsync).toHaveBeenCalledWith(today, expect.any(Date));

    // Steps since the card started watching come on top.
    await act(() => newSteps(4000));
    expect(screen.getByLabelText('10.240 / 10.000 passos')).toBeOnTheScreen();
    expect(screen.getByText('Objectiu assolit')).toBeOnTheScreen();
    expect(screen.getByText(/^102\s%$/)).toBeOnTheScreen();
  });

  test('uses your own goal', async () => {
    jest.mocked(fetchProfile).mockResolvedValue({ daily_step_goal: 8000 } as Profile);
    await render(<StepsCard today={today} />, { wrapper: createAppWrapper() });

    expect(await screen.findByLabelText('6.240 / 8.000 passos')).toBeOnTheScreen();
    expect(screen.getByText('1.760 per arribar')).toBeOnTheScreen();
  });

  test('reads them again when the app comes back to the front', async () => {
    const listeners: ((state: AppStateStatus) => void)[] = [];
    // Once: React Native's own AppState mock stays for the other tests.
    jest.spyOn(AppState, 'addEventListener').mockImplementationOnce((_type, listener) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    });
    await render(<StepsCard today={today} />, { wrapper: createAppWrapper() });
    expect(await screen.findByLabelText('6.240 / 10.000 passos')).toBeOnTheScreen();

    // Walked with the app closed.
    jest.mocked(Pedometer.getStepCountAsync).mockResolvedValue({ steps: 7100 });
    await act(() => listeners.forEach((listener) => listener('active')));

    expect(await screen.findByLabelText('7.100 / 10.000 passos')).toBeOnTheScreen();
    expect(stopWatching).toHaveBeenCalled();
  });

  test('asks for Motion & Fitness only when you tap', async () => {
    const user = userEvent.setup();
    jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(notAsked as never);
    await render(<StepsCard today={today} />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Mostra els passos que compta el teu iPhone.')).toBeOnTheScreen();
    expect(Pedometer.requestPermissionsAsync).not.toHaveBeenCalled();

    jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(granted as never);
    await user.press(screen.getByRole('button', { name: 'Mostra els passos' }));

    expect(await screen.findByLabelText('6.240 / 10.000 passos')).toBeOnTheScreen();
    expect(Pedometer.requestPermissionsAsync).toHaveBeenCalled();
  });

  test('once refused, it points to Settings', async () => {
    const user = userEvent.setup();
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(refused as never);
    await render(<StepsCard today={today} />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Obre Configuració' }));
    expect(openSettings).toHaveBeenCalled();
    openSettings.mockRestore();
  });

  test('without a step counter, nothing shows', async () => {
    jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(false);
    await render(<StepsCard today={today} />, { wrapper: createAppWrapper() });

    await waitFor(() => expect(Pedometer.isAvailableAsync).toHaveBeenCalled());
    expect(screen.queryByText("Passos d'avui")).not.toBeOnTheScreen();
    expect(screen.queryByText(/passos/)).not.toBeOnTheScreen();
  });
});
