import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ActionSheetIOS } from 'react-native';

import { NO_TARGETS } from '@/features/routines/routine';
import { testExercise, upperBody } from '@/features/routines/testData';
import { deleteSession } from '@/features/workout/api';
import { workoutFromRoutine } from '@/features/workout/activeWorkout';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchHistoryPage, fetchPastWorkout, saveWorkout } from './api';
import { HistoryList } from './HistoryList';
import type { PastWorkout } from './pastWorkout';
import { PastWorkoutView } from './PastWorkoutView';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({
  HISTORY_PAGE_SIZE: 30,
  fetchHistoryPage: jest.fn(),
  fetchPastWorkout: jest.fn(),
  saveWorkout: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/workout/api', () => ({ deleteSession: jest.fn(() => Promise.resolve()) }));

const workout: PastWorkout = {
  id: 'session-1',
  date: '2026-10-20',
  plannedRoutineId: 'routine-1',
  routineId: 'routine-1',
  routineName: 'Tren superior 1',
  changeReason: null,
  logMode: 'live',
  startedAt: '2026-10-20T17:00:00.000Z',
  endedAt: '2026-10-20T18:00:00.000Z',
  durationS: null,
  energy: 4,
  notes: 'Molt bé',
  exercises: [
    {
      id: 'se-1',
      exerciseId: 'lat',
      exercise: testExercise('lat', 'Tracció al pit'),
      replaced: null,
      routineExerciseId: 're-1',
      groupKey: null,
      restS: 90,
      change: null,
      changeReason: null,
      notes: null,
      sets: [
        {
          id: 'set-1',
          setType: 'normal',
          numbers: { ...NO_TARGETS, weightKg: 40, reps: 10 },
          rpe: 8,
          completedAt: '2026-10-20T17:10:00.000Z',
        },
      ],
    },
  ],
};

let actionSheet: jest.SpyInstance;
beforeEach(() => {
  useWorkoutStore.setState({ active: null, pending: [] });
  jest.mocked(router.push).mockReset();
  jest.mocked(deleteSession).mockClear();
  jest.mocked(saveWorkout).mockClear();
  // Each action sheet picks its first option.
  actionSheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((_options, callback) => callback(0));
});
afterEach(() => actionSheet.mockRestore());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('History', () => {
  test('lists workouts by month, newest first; a tap opens one', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryPage).mockResolvedValue([
      { id: 'session-1', date: '2026-10-20', routineName: 'Tren superior 1', logMode: 'live', durationS: 3600, exercises: 4, sets: 14 },
      { id: 'session-2', date: '2026-09-28', routineName: null, logMode: 'quick', durationS: 3000, exercises: 0, sets: 0 },
    ]);
    await render(<HistoryList />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('1 h · 4 exercicis · 14 sèries')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Octubre del 2026' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Setembre del 2026' })).toBeOnTheScreen();
    expect(screen.getByText('50 min · Registre ràpid')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /^Tren superior 1, / }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/history/[sessionId]',
      params: { sessionId: 'session-1' },
    });
  });

  test('with no workouts yet, a friendly note', async () => {
    jest.mocked(fetchHistoryPage).mockResolvedValue([]);
    await render(<HistoryList />, { wrapper: createAppWrapper() });
    expect(await screen.findByText(/Encara no hi ha entrenaments/)).toBeOnTheScreen();
  });

  test('a workout waiting for signal shows first', async () => {
    jest.mocked(fetchHistoryPage).mockResolvedValue([]);
    useWorkoutStore.setState({
      pending: [
        {
          ...workoutFromRoutine(upperBody, {
            date: '2026-10-21',
            plannedRoutineId: null,
            changeReason: null,
            startedAt: '2026-10-21T17:00:00.000Z',
            newId: () => Math.random().toString(),
            defaultRestS: () => 90,
          }),
          endedAt: '2026-10-21T17:45:00.000Z',
          energy: null,
          notes: null,
        },
      ],
    });
    await render(<HistoryList />, { wrapper: createAppWrapper() });
    expect(await screen.findByText('45 min · Pendent de desar')).toBeOnTheScreen();
  });

  test('a workout: totals, energy, note and its sets', async () => {
    jest.mocked(fetchPastWorkout).mockResolvedValue(workout);
    await render(<PastWorkoutView id="session-1" onDeleted={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(await screen.findByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
    expect(screen.getByText('Dimarts, 20 d’octubre')).toBeOnTheScreen();
    expect(screen.getByText('1 h · 1 exercici · 1 sèrie · 400 kg')).toBeOnTheScreen();
    expect(screen.getByText('Energia: 4 de 5')).toBeOnTheScreen();
    expect(screen.getByText('Molt bé')).toBeOnTheScreen();
    expect(screen.getByText('40 kg × 10')).toBeOnTheScreen();
    expect(screen.getByText('@8')).toBeOnTheScreen();
  });

  test('deleting goes at once, and Desfés saves it back whole', async () => {
    const user = userEvent.setup();
    const onDeleted = jest.fn();
    jest.mocked(fetchPastWorkout).mockResolvedValue(workout);
    await render(<PastWorkoutView id="session-1" onDeleted={onDeleted} />, {
      wrapper: createAppWrapper(),
    });

    await user.press(await screen.findByRole('button', { name: "Opcions de l'entrenament" }));
    expect(actionSheet.mock.lastCall?.[0].options[0]).toBe("Esborra l'entrenament");
    expect(onDeleted).toHaveBeenCalled();
    await waitFor(() => expect(deleteSession).toHaveBeenCalledWith('session-1'));

    await user.press(await screen.findByRole('button', { name: 'Desfés' }));
    await waitFor(() => expect(saveWorkout).toHaveBeenCalledWith(workout));
  });
});
