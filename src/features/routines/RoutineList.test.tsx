import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { menus } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchArchivedRoutines, fetchRoutines, setRoutineArchived } from './api';
import { NO_TARGETS } from './routine';
import { RoutineList } from './RoutineList';
import { upperBody } from './testData';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  fetchRoutines: jest.fn(),
  fetchArchivedRoutines: jest.fn(),
  setRoutineArchived: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const mockFetchRoutines = jest.mocked(fetchRoutines);

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(router.push).mockReset();
  jest.mocked(fetchArchivedRoutines).mockResolvedValue([]);
  jest.mocked(setRoutineArchived).mockReset().mockResolvedValue();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<RoutineList />', () => {
  test('invites you to create your first routine', async () => {
    const user = userEvent.setup();
    mockFetchRoutines.mockResolvedValue([]);
    await render(<RoutineList />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Encara no tens rutines')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Nova rutina' }));
    expect(router.push).toHaveBeenCalledWith('/plan/routines/new');
  });

  test('shows each routine with its type, what is in it and its days, and opens it', async () => {
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
        // 6 × 400 m, then 2 km.
        { ...upperBody.exercises[0], sets: Array(6).fill({ ...NO_TARGETS, distanceM: 400 }) },
        { ...upperBody.exercises[1], sets: [{ ...NO_TARGETS, distanceM: 2000 }] },
      ],
    };
    mockFetchRoutines.mockResolvedValue([
      { ...upperBody, weekdays: [1, 4] },
      hyrox,
      swim,
      spinning,
      intervals,
    ]);
    await render(<RoutineList />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Tren superior 1')).toBeOnTheScreen();
    // How many exercises, not which; its days as bubbles. The type is an
    // icon, so screen readers hear it in the card's label.
    expect(screen.getByText('4 exercicis')).toBeOnTheScreen();
    expect(screen.getByText('Dl')).toBeOnTheScreen();
    expect(screen.getByText('Dj')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Tren superior 1, Força, 4 exercicis, Dilluns, Dijous' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^HYROX dimarts, Híbrid, / })).toBeOnTheScreen();
    // A custom type says its own name.
    expect(screen.getByRole('button', { name: /^Piscina, Natació, / })).toBeOnTheScreen();
    // HYROX dimarts and Piscina: a duration, and no exercises yet.
    expect(screen.getAllByText('1 h · Encara sense exercicis')).toHaveLength(2);
    // A run: its whole distance (6 × 400 m and 2 km).
    expect(screen.getByText('4,4 km')).toBeOnTheScreen();
    // A class: just its duration, never its exercises.
    expect(screen.getByText('45 min')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /^Tren superior 1/ }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/[id]',
      params: { id: 'routine-1' },
    });
  });

  test('archives a routine from its menu, with Desfés; archived ones have their own list', async () => {
    const user = userEvent.setup();
    const actionSheet = jest
      .spyOn(menus, 'show')
      .mockImplementation((options, callback) => callback(options.options.indexOf('Arxiva')));
    const legs = { ...upperBody, id: 'routine-2', name: 'Cames' };
    mockFetchRoutines.mockResolvedValue([upperBody]);
    jest.mocked(fetchArchivedRoutines).mockResolvedValue([legs]);
    await render(<RoutineList />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Opcions de «Tren superior 1»' }));

    expect(setRoutineArchived).toHaveBeenCalledWith('routine-1', true);
    expect(screen.queryByText('Tren superior 1')).not.toBeOnTheScreen();
    expect(screen.getByText("S'ha arxivat «Tren superior 1»")).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(setRoutineArchived).toHaveBeenLastCalledWith('routine-1', false);

    await user.press(await screen.findByRole('button', { name: /Rutines arxivades/ }));
    expect(router.push).toHaveBeenCalledWith('/plan/routines/archived');
    actionSheet.mockRestore();
  });
});
