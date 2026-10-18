import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { fetchRoutines } from './api';
import { RoutineList } from './RoutineList';
import { upperBody } from './testData';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockFetchRoutines = jest.mocked(fetchRoutines);

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(router.push).mockReset();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<RoutineList />', () => {
  test('invites you to create your first routine', async () => {
    const user = userEvent.setup();
    mockFetchRoutines.mockResolvedValue([]);
    await render(<RoutineList />, { wrapper: createQueryWrapper() });

    expect(await screen.findByText('Encara no tens rutines')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Nova rutina' }));
    expect(router.push).toHaveBeenCalledWith('/plan/routines/new');
  });

  test('shows each routine with its label and first exercises, and opens it', async () => {
    const user = userEvent.setup();
    const hyrox = { ...upperBody, id: 'routine-2', name: 'HYROX dimarts', label: 'hybrid' as const, plannedDurationS: 3600, exercises: [] };
    const spinning = { ...upperBody, id: 'routine-4', name: 'Spinning', label: 'class' as const, plannedDurationS: 2700 };
    const swim = { ...hyrox, id: 'routine-3', name: 'Piscina', label: 'custom' as const, customLabel: 'Natació' };
    const intervals = {
      ...upperBody,
      id: 'routine-5',
      name: 'Sèries',
      label: 'run' as const,
      exercises: [
        { ...upperBody.exercises[0], plannedSets: 6, targets: { ...upperBody.exercises[0].targets, distanceM: 400 } },
        { ...upperBody.exercises[1], plannedSets: 1, targets: { ...upperBody.exercises[1].targets, distanceM: 2000 } },
      ],
    };
    mockFetchRoutines.mockResolvedValue([
      { ...upperBody, weekdays: [1, 4] },
      hyrox,
      swim,
      spinning,
      intervals,
    ]);
    await render(<RoutineList />, { wrapper: createQueryWrapper() });

    expect(await screen.findByText('Tren superior 1')).toBeOnTheScreen();
    expect(screen.getByText('Força')).toBeOnTheScreen();
    expect(
      // Its days come first.
      screen.getByText('Dl, Dj · 4 exercicis · Tracció al pit, Rem assegut amb politja, Face pull…'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Híbrid')).toBeOnTheScreen();
    // A custom type shows its own name.
    expect(screen.getByText('Natació')).toBeOnTheScreen();
    // HYROX dimarts and Piscina: a duration, and no exercises yet.
    expect(screen.getAllByText('1 h · Encara sense exercicis')).toHaveLength(2);
    // A run lists its blocks.
    expect(screen.getByText('2 blocs · 6 × 400 m, 2 km')).toBeOnTheScreen();
    // A class: just its duration, never its exercises.
    expect(screen.getByText('45 min')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Tren superior 1/ }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/[id]',
      params: { id: 'routine-1' },
    });
  });
});
