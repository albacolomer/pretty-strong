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
    const hyrox = { ...upperBody, id: 'routine-2', name: 'HYROX dimarts', label: 'hyrox' as const, exercises: [] };
    mockFetchRoutines.mockResolvedValue([upperBody, hyrox]);
    await render(<RoutineList />, { wrapper: createQueryWrapper() });

    expect(await screen.findByText('Tren superior 1')).toBeOnTheScreen();
    expect(screen.getByText('Força')).toBeOnTheScreen();
    expect(
      screen.getByText('4 exercicis · Tracció al pit, Rem assegut amb politja, Face pull…'),
    ).toBeOnTheScreen();
    expect(screen.getByText('HYROX')).toBeOnTheScreen();
    expect(screen.getByText('Encara sense exercicis')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /Tren superior 1/ }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/[id]',
      params: { id: 'routine-1' },
    });
  });
});
