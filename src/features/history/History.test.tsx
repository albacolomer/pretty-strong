import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';

import { menus } from '@/components/ui';
import { NO_TARGETS } from '@/features/routines/routine';
import { fetchRoutines } from '@/features/routines/api';
import { testExercise, upperBody } from '@/features/routines/testData';
import { fetchMoves } from '@/features/schedule/movesApi';
import { deleteEvent, fetchEvents, saveEvent } from '@/features/events/api';
import type { CalendarEvent } from '@/features/events/events';
import { fetchDailySteps } from '@/features/steps/api';
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
jest.mock('@/features/events/api', () => ({
  fetchEvents: jest.fn(() => Promise.resolve([])),
  saveEvent: jest.fn(() => Promise.resolve()),
  deleteEvent: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-event' }));
// iOS's own date picker (SwiftUI) needs the phone: a button that picks
// 6 December 2026 stands in for it.
jest.mock('@expo/ui/swift-ui', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    Host: ({ children }: { children: unknown }) => children,
    DatePicker: ({ onDateChange }: { onDateChange: (date: Date) => void }) => (
      <Pressable role="button" onPress={() => onDateChange(new Date(2026, 11, 6, 9))}>
        <Text>Tria el 6 de desembre</Text>
      </Pressable>
    ),
  };
});
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  datePickerStyle: () => ({}),
  environment: () => ({}),
  labelsHidden: () => ({}),
}));
jest.mock('@/features/steps/api', () => ({
  fetchDailySteps: jest.fn(() => Promise.resolve(new Map())),
}));
// The phone has counted nothing today unless a test says otherwise.
jest.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
    getStepCountAsync: jest.fn(() => Promise.resolve({ steps: 0 })),
    watchStepCount: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
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
    routineId: 'upper-1',
    routineLabel: 'strength',
    customLabel: null,
    sport: null,
    sportName: null,
    eventKind: null,
    eventName: null,
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
  feeling: 4,
  notes: 'Molt bé',
  plannedSportId: null,
  sport: null,
  sportName: null,
  plannedEventId: null,
  eventKind: null,
  eventName: null,
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

const hyrox: CalendarEvent = {
  id: 'event-1',
  date: '2026-11-14',
  kind: 'hyrox',
  name: 'HYROX Barcelona',
  place: 'Fira de Barcelona',
  notes: null,
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
  jest.mocked(saveEvent).mockClear();
  jest.mocked(deleteEvent).mockClear();
  jest.mocked(fetchEvents).mockResolvedValue([]);
  sheetChoices.length = 0;
  // Each action sheet picks the next of sheetChoices.
  actionSheet = jest
    .spyOn(menus, 'show')
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

  test("an event's session shows with the event's name, as it was logged", async () => {
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({
        id: 'session-8',
        date: '2026-10-21',
        routineName: null,
        routineLabel: null,
        eventKind: 'hyrox',
        eventName: 'HYROX Barcelona',
        logMode: 'quick',
        durationS: 4500,
        exercises: 0,
        sets: 0,
        volumeKg: 0,
      }),
      entry({
        id: 'session-9',
        date: '2026-10-21',
        routineName: null,
        routineLabel: null,
        eventKind: 'marathon',
        logMode: 'quick',
        durationS: 13500,
        exercises: 0,
        sets: 0,
        volumeKg: 0,
      }),
    ]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('HYROX Barcelona')).toBeOnTheScreen();
    expect(screen.getByText('dc., 21 d’oct. · 1 h 15 min')).toBeOnTheScreen();
    // Without a name of its own: its kind's.
    expect(screen.getByText('Marató')).toBeOnTheScreen();
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

  test("a day shows its steps: today's live from the phone, others' as saved", async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
    jest.mocked(Pedometer.getStepCountAsync).mockResolvedValueOnce({ steps: 6240 });
    jest.mocked(fetchDailySteps).mockResolvedValueOnce(new Map([['2026-10-20', 8432]]));
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('6.240 passos')).toBeOnTheScreen();
    expect(Pedometer.getStepCountAsync).toHaveBeenCalledWith(new Date(2026, 9, 21), expect.any(Date));

    await user.press(screen.getByRole('button', { name: 'Dimarts, 20 d’octubre: cap entrenament' }));
    expect(await screen.findByText('8.432 passos')).toBeOnTheScreen();
    // The whole month at once.
    expect(fetchDailySteps).toHaveBeenCalledWith('2026-10-01', '2026-10-31');

    // None saved that day: nothing about steps.
    await user.press(screen.getByRole('button', { name: 'Dijous, 15 d’octubre: cap entrenament' }));
    expect(screen.getByText('Aquest dia no hi ha cap activitat.')).toBeOnTheScreen();
    expect(screen.queryByText(/passos$/)).not.toBeOnTheScreen();
  });

  test('‹ shows last month at its latest activity; › comes back to today', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({ id: 'session-3', date: '2026-09-28', routineName: 'Diumenge' }),
    ]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });
    await screen.findByText('Avui encara no hi ha cap activitat.');

    await user.press(screen.getByRole('button', { name: 'Mes anterior' }));

    expect(screen.getByRole('header', { name: 'Setembre del 2026' })).toBeOnTheScreen();
    expect(screen.getByText('1 entrenament aquest mes')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Dilluns, 28 de setembre' })).toBeOnTheScreen();
    expect(screen.getByText('Diumenge')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Mes següent' }));
    expect(screen.getByRole('header', { name: 'Avui' })).toBeOnTheScreen();
  });

  test('› goes into months to come, at their first event; their days only have events', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
    jest.mocked(fetchEvents).mockResolvedValueOnce([hyrox]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });
    await screen.findByText('Avui encara no hi ha cap activitat.');

    await user.press(screen.getByRole('button', { name: 'Mes següent' }));

    expect(screen.getByRole('header', { name: 'Novembre del 2026' })).toBeOnTheScreen();
    expect(screen.getByText('1 esdeveniment aquest mes')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Dissabte, 14 de novembre' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Dissabte, 14 de novembre: cap entrenament, 1 esdeveniment' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('HYROX Barcelona')).toBeOnTheScreen();
    expect(screen.getByText('HYROX · Fira de Barcelona')).toBeOnTheScreen();
    // Nothing to log in the future.
    expect(screen.queryByRole('button', { name: '+ Registra una activitat' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Diumenge, 15 de novembre: cap entrenament' }));
    expect(screen.getByText('Aquest dia no hi ha cap esdeveniment.')).toBeOnTheScreen();
  });

  test('an event is added on the picked day, or on another one', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });
    await screen.findByText('Avui encara no hi ha cap activitat.');

    await user.press(screen.getByRole('button', { name: 'Divendres, 30 d’octubre: cap entrenament' }));
    await user.press(screen.getByRole('button', { name: '+ Afegeix un esdeveniment' }));
    expect(screen.getByRole('header', { name: 'Nou esdeveniment' })).toBeOnTheScreen();
    // A kind first.
    expect(screen.getByRole('button', { name: 'Desa' })).toBeDisabled();
    await user.press(screen.getByRole('radio', { name: 'Marató' }));
    await user.type(screen.getByLabelText('Nom (opcional)'), 'Marató de València');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() =>
      expect(saveEvent).toHaveBeenCalledWith({
        id: 'new-event',
        date: '2026-10-30',
        kind: 'marathon',
        name: 'Marató de València',
        place: null,
        notes: null,
      }),
    );
    expect(await screen.findByText('Esdeveniment desat')).toBeOnTheScreen();

    // Another day, from the date picker; "Altres" needs a name.
    await user.press(screen.getByRole('button', { name: '+ Afegeix un esdeveniment' }));
    await user.press(screen.getByRole('radio', { name: 'Altres' }));
    expect(screen.getByRole('button', { name: 'Desa' })).toBeDisabled();
    await user.type(screen.getByLabelText('Nom'), 'Aniversari');
    await user.press(screen.getByRole('button', { name: 'Tria el 6 de desembre' }));
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(saveEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ date: '2026-12-06', kind: 'other', name: 'Aniversari' }),
      ),
    );
  });

  test("an event's menu edits it, or deletes it with Desfés", async () => {
    const user = userEvent.setup();
    jest.mocked(fetchHistoryEntries).mockResolvedValue([]);
    jest.mocked(fetchEvents).mockResolvedValue([{ ...hyrox, date: '2026-10-21' }]);
    await render(<CalendarTab />, { wrapper: createAppWrapper() });

    sheetChoices.push('Edita');
    await user.press(await screen.findByRole('button', { name: 'Opcions de HYROX Barcelona' }));
    expect(screen.getByRole('header', { name: "Edita l'esdeveniment" })).toBeOnTheScreen();
    expect(screen.getByLabelText('Nom (opcional)')).toHaveDisplayValue('HYROX Barcelona');
    await user.clear(screen.getByLabelText('Lloc (opcional)'));
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(saveEvent).toHaveBeenLastCalledWith({ ...hyrox, date: '2026-10-21', place: null }),
    );

    sheetChoices.push("Esborra l'esdeveniment");
    await user.press(screen.getByRole('button', { name: 'Opcions de HYROX Barcelona' }));
    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith('event-1'));
    expect(await screen.findByText('Esdeveniment esborrat')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    await waitFor(() =>
      expect(saveEvent).toHaveBeenLastCalledWith({ ...hyrox, date: '2026-10-21' }),
    );
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
          feeling: null,
          notes: null,
        },
      ],
    });
    await render(<CalendarTab />, { wrapper: createAppWrapper() });
    expect(
      await screen.findByText('dc., 21 d’oct. · 45 min · Pendent de desar'),
    ).toBeOnTheScreen();
  });

  test('a workout: totals, how it felt, note and its sets', async () => {
    jest.mocked(fetchPastWorkout).mockResolvedValue(workout);
    await render(<PastWorkoutView id="session-1" onEdit={jest.fn()} onDeleted={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(await screen.findByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
    expect(screen.getByText('Dimarts, 20 d’octubre')).toBeOnTheScreen();
    expect(screen.getByText('1 h · 1 exercici · 1 sèrie · 400 kg')).toBeOnTheScreen();
    expect(screen.getByText("Com t'has sentit: 4/10 · Regular")).toBeOnTheScreen();
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
