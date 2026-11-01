import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ActionSheetIOS } from 'react-native';

import { NO_TARGETS } from '@/features/routines/routine';
import { fetchRoutines } from '@/features/routines/api';
import { testExercise, upperBody } from '@/features/routines/testData';
import { fetchMoves } from '@/features/schedule/movesApi';
import { deleteSession } from '@/features/workout/api';
import { workoutFromRoutine } from '@/features/workout/activeWorkout';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchHistoryEntries, fetchPastWorkout, saveWorkout } from './api';
import { CalendarTab } from './CalendarTab';
import type { HistoryEntry } from './entries';
import type { PastWorkout } from './pastWorkout';
import { PastWorkoutView } from './PastWorkoutView';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/schedule/sportsApi', () => ({ fetchWeeklySports: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/features/schedule/movesApi', () => ({ fetchMoves: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({
  fetchHistoryEntries: jest.fn(),
  fetchPastWorkout: jest.fn(),
  saveWorkout: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/workout/api', () => ({ deleteSession: jest.fn(() => Promise.resolve()) }));
jest.mock('@/features/routines/api', () => ({
  fetchRoutines: jest.fn(() =>
    Promise.resolve([jest.requireActual('@/features/routines/testData').upperBody]),
  ),
}));

function entry(values: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'session-1',
    date: '2026-10-20',
    routineName: 'Tren superior 1',
    routineLabel: 'strength',
    customLabel: null,
    sport: null,
    sportName: null,
    logMode: 'live',
    durationS: 3600,
    exercises: 4,
    sets: 14,
    volumeKg: 7240,
    distanceM: 0,
    runDistanceM: 0,
    pace: null,
    pending: false,
    ...values,
  };
}

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
  plannedSportId: null,
  sport: null,
  sportName: null,
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

const sheetChoices: string[] = [];
let actionSheet: jest.SpyInstance;
beforeEach(() => {
  // Today is Wednesday 21 October 2026; only the date is faked.
  jest.useFakeTimers({
    now: new Date(2026, 9, 21, 12),
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
  useWorkoutStore.setState({ active: null, pending: [] });
  jest.mocked(router.push).mockReset();
  jest.mocked(deleteSession).mockClear();
  jest.mocked(saveWorkout).mockClear();
  sheetChoices.length = 0;
  // Each action sheet picks the next of sheetChoices.
  actionSheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});
afterEach(() => {
  actionSheet.mockRestore();
  jest.useRealTimers();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('History', () => {
  test('opens on today: its activities, and another can be logged; a tap opens one', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({ id: 'session-1', date: '2026-10-21' }),
      entry({ id: 'session-2', date: '2026-10-20', routineName: 'Tren inferior 1' }),
    ]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    expect(screen.getByRole('header', { name: 'Octubre del 2026' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Avui' })).toBeOnTheScreen();
    expect(await screen.findByText('dc., 21 d’oct. · 1 h · 7.240 kg')).toBeOnTheScreen();
    expect(screen.queryByText('Tren inferior 1')).not.toBeOnTheScreen();
    expect(screen.getByText('2 entrenaments aquest mes')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '+ Registra una altra activitat' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: /^Tren superior 1, / }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/profile/history/[sessionId]',
      params: { sessionId: 'session-1' },
    });
  });

  test('a sport session shows with its name and time', async () => {
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({
        id: 'session-9',
        date: '2026-10-21',
        routineName: null,
        routineLabel: null,
        sport: 'padel',
        logMode: 'quick',
        durationS: 5400,
        exercises: 0,
        sets: 0,
        volumeKg: 0,
      }),
    ]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Pàdel')).toBeOnTheScreen();
    expect(screen.getByText('dc., 21 d’oct. · 1 h 30 min')).toBeOnTheScreen();
  });

  test('today without activity says so, or that it is a rest day', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    // Nothing planned at all: no rest days either.
    expect(await screen.findByText('Avui encara no hi ha cap activitat.')).toBeOnTheScreen();
    sheetChoices.push('Tren superior 1');
    await user.press(screen.getByRole('button', { name: '+ Registra una activitat' }));
    expect(actionSheet.mock.lastCall?.[0].title).toBe('Registra una activitat: Dimecres, 21 d’octubre');
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/profile/history/new',
      params: { date: '2026-10-21', routineId: 'routine-1' },
    });
  });

  test('a day with nothing planned is a rest day', async () => {
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
    // Only Mondays planned; today is a Wednesday.
    jest.mocked(fetchRoutines).mockResolvedValueOnce([{ ...upperBody, weekdays: [1] }]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Avui és el teu dia de descans.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '+ Registra una activitat' })).toBeOnTheScreen();
  });

  test("a day whose routine moved away this week is a rest day", async () => {
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
    // Planned on Wednesdays, but this week it went to Friday.
    jest
      .mocked(fetchRoutines)
      .mockResolvedValueOnce([{ ...upperBody, weekdays: [3], dayPositions: { 3: 0 } }]);
    jest.mocked(fetchMoves).mockResolvedValueOnce([
      { routineId: upperBody.id, plannedDate: '2026-10-21', movedTo: '2026-10-23', position: 0 },
    ]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Avui és el teu dia de descans.')).toBeOnTheScreen();
    expect(fetchMoves).toHaveBeenCalledWith('2026-10-18', '2026-10-25');
  });

  test('a tap on another day shows it; an empty one can have an activity logged', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({ id: 'session-2', date: '2026-10-20', routineName: 'Tren inferior 1' }),
    ]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });
    await screen.findByText('Avui encara no hi ha cap activitat.');

    await user.press(screen.getByRole('button', { name: 'Dimarts, 20 d’octubre: 1 entrenament' }));
    expect(screen.getByRole('header', { name: 'Dimarts, 20 d’octubre' })).toBeOnTheScreen();
    expect(screen.getByText('Tren inferior 1')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Dijous, 15 d’octubre: cap entrenament' }));
    expect(screen.getByText('Aquest dia no hi ha cap activitat.')).toBeOnTheScreen();
    sheetChoices.push('Entrenament sense rutina');
    await user.press(screen.getByRole('button', { name: '+ Registra una activitat' }));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/profile/history/new',
      params: { date: '2026-10-15' },
    });
  });

  test('‹ shows last month at its latest activity; there is nothing after this one', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({ id: 'session-3', date: '2026-09-28', routineName: 'Diumenge' }),
    ]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });
    await screen.findByText('Avui encara no hi ha cap activitat.');

    expect(screen.getByRole('button', { name: 'Mes següent' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Mes anterior' }));

    expect(screen.getByRole('header', { name: 'Setembre del 2026' })).toBeOnTheScreen();
    expect(screen.getByText('1 entrenament aquest mes')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Dilluns, 28 de setembre' })).toBeOnTheScreen();
    expect(screen.getByText('Diumenge')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Mes següent' }));
    expect(screen.getByRole('header', { name: 'Avui' })).toBeOnTheScreen();
  });

  test('a workout waiting for signal shows too', async () => {
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
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
    await render(<CalendarTab />, { wrapper: createAppWrapper() });
    expect(
      await screen.findByText('dc., 21 d’oct. · 45 min · Pendent de desar'),
    ).toBeOnTheScreen();
  });

  test('a workout: totals, energy, note and its sets', async () => {
    jest.mocked(fetchPastWorkout).mockResolvedValue(workout);
    await render(<PastWorkoutView id="session-1" onEdit={jest.fn()} onDeleted={jest.fn()} />, {
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
    await render(<PastWorkoutView id="session-1" onEdit={jest.fn()} onDeleted={onDeleted} />, {
      wrapper: createAppWrapper(),
    });

    sheetChoices.push("Esborra l'entrenament");
    await user.press(await screen.findByRole('button', { name: "Opcions de l'entrenament" }));
    expect(onDeleted).toHaveBeenCalled();
    await waitFor(() => expect(deleteSession).toHaveBeenCalledWith('session-1'));

    await user.press(await screen.findByRole('button', { name: 'Desfés' }));
    await waitFor(() => expect(saveWorkout).toHaveBeenCalledWith(workout));
  });
});
