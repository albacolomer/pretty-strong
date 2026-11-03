import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';

import { menus } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchEvents } from '@/features/events/api';
import type { CalendarEvent } from '@/features/events/events';
import { fetchHistoryEntries } from '@/features/history/api';
import type { HistoryEntry } from '@/features/history/entries';
import { fetchProfile, type Profile } from '@/features/profile/api';
import { fetchRoutines } from '@/features/routines/api';
import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { workoutFromRoutine } from '@/features/workout/activeWorkout';
import { deleteSession, fetchSessions, logQuickSession } from '@/features/workout/api';
import type { WorkoutSession } from '@/features/workout/session';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import { ensureNotificationPermission } from '@/lib/notifications';
import { createAppWrapper } from '@/test-utils/appWrapper';
import { drop } from '@/test-utils/sortablesMock';

import { fetchMoves, replaceMoves } from './movesApi';
import type { WeeklySport } from './sports';
import { fetchWeeklySports } from './sportsApi';
import { Today } from './Today';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('@/features/profile/api', () => ({ fetchProfile: jest.fn() }));
// Your finished workouts with their totals.
jest.mock('@/features/history/api', () => ({ fetchHistoryEntries: jest.fn() }));
// No step counter, unless a test counts steps (see stepsCounted).
jest.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getStepCountAsync: jest.fn(),
    watchStepCount: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
jest.mock('@/features/body/photosApi', () => ({
  SIGNED_URL_SECONDS: 3600,
  fetchSignedUrls: jest.fn(() => Promise.resolve({})),
}));
// Your default rest: 2:30 for the first exercise, the app's for the rest.
jest.mock('@/features/exercises/api', () => ({
  fetchExerciseSettings: jest.fn(() =>
    Promise.resolve({ 'exercise-1': { notes: null, defaultRestS: 150 } }),
  ),
}));
// No competitions or special dates, unless a test adds some.
jest.mock('@/features/events/api', () => ({ fetchEvents: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ ensureNotificationPermission: jest.fn() }));
jest.mock('@/features/workout/api', () => ({
  fetchSessions: jest.fn(),
  logQuickSession: jest.fn(),
  deleteSession: jest.fn(),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'session-1' }));
// The screen's link parameters, e.g. { start } from the routine editor.
let mockParams: { start?: string; swap?: string; swapFor?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
// Today is Tuesday 20 October 2026.
jest.mock('./useToday', () => ({ useToday: () => new Date(2026, 9, 20) }));
jest.mock('./sportsApi', () => ({ fetchWeeklySports: jest.fn() }));
jest.mock('./movesApi', () => ({ fetchMoves: jest.fn(), replaceMoves: jest.fn() }));
jest.mock('react-native-sortables', () => jest.requireActual('@/test-utils/sortablesMock'));

const routine = (
  id: string,
  name: string,
  dayPositions: Routine['dayPositions'],
  extra: Partial<Routine> = {},
): Routine => ({
  ...upperBody,
  id,
  name,
  weekdays: Object.keys(dayPositions)
    .map(Number)
    .sort((a, b) => a - b) as Routine['weekdays'],
  dayPositions,
  ...extra,
});

// Tuesday: a morning class, then the upper-body routine. Friday: upper body.
// Legs: on no day.
const upper = routine('upper', 'Tren superior 1', { 2: 1, 5: 0 });
const spinning = routine('spinning', 'Spinning', { 2: 0 }, {
  label: 'class',
  plannedDurationS: 2700,
  exercises: [],
});
const legs = routine('legs', 'Cames', {});

const sport = (values: Partial<WeeklySport>): WeeklySport => ({
  id: 'padel',
  weekday: 2,
  sport: 'padel',
  customName: null,
  startTime: '19:00',
  durationS: 5400,
  position: 2,
  ...values,
});

const session = (fields: Partial<WorkoutSession>): WorkoutSession => ({
  id: 'session-1',
  date: '2026-10-20',
  plannedRoutineId: 'upper',
  routineId: 'upper',
  status: 'completed',
  logMode: 'quick',
  durationS: null,
  notes: null,
  changeReason: null,
  plannedSportId: null,
  sport: null,
  sportName: null,
  plannedEventId: null,
  eventKind: null,
  eventName: null,
  ...fields,
});

// A finished workout as History has it, with its totals.
const entry = (fields: Partial<HistoryEntry>): HistoryEntry => ({
  id: 'session-1',
  date: '2026-10-20',
  routineName: 'Tren superior 1',
  routineId: 'upper',
  routineLabel: 'strength',
  customLabel: null,
  sport: null,
  sportName: null,
  eventKind: null,
  eventName: null,
  logMode: 'live',
  durationS: 3900,
  exercises: 4,
  sets: 12,
  volumeKg: 5200,
  distanceM: 0,
  runDistanceM: 0,
  pace: null,
  pending: false,
  ...fields,
});

// The phone counted this many steps today.
function stepsCounted(steps: number) {
  jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(true);
  jest
    .mocked(Pedometer.getPermissionsAsync)
    .mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' } as never);
  jest.mocked(Pedometer.getStepCountAsync).mockResolvedValue({ steps });
}

// What the database holds once a session is logged, for the refetch after.
function keepLogged() {
  jest.mocked(logQuickSession).mockImplementation((logged) => {
    jest.mocked(fetchSessions).mockResolvedValue([logged]);
    return Promise.resolve();
  });
}

// What the database holds once the week's moves are saved.
function keepMoves() {
  jest.mocked(replaceMoves).mockImplementation((_from, _to, moves) => {
    jest.mocked(fetchMoves).mockResolvedValue([...moves]);
    return Promise.resolve();
  });
}

// The options of the last native action sheet shown.
function lastSheet(): string[] {
  return actionSheet.mock.lastCall?.[0].options ?? [];
}

// Each native action sheet picks the next of these labels.
const sheetChoices: string[] = [];
let actionSheet: jest.SpyInstance;

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(fetchProfile).mockResolvedValue({ username: 'alba', weekly_goal: 4 } as Profile);
  jest.mocked(fetchRoutines).mockResolvedValue([upper, spinning, legs]);
  jest.mocked(fetchSessions).mockReset().mockResolvedValue([]);
  jest.mocked(fetchHistoryEntries).mockReset().mockResolvedValue([]);
  jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(false);
  jest.mocked(fetchWeeklySports).mockResolvedValue([]);
  jest.mocked(fetchEvents).mockResolvedValue([]);
  jest.mocked(fetchMoves).mockReset().mockResolvedValue([]);
  jest.mocked(replaceMoves).mockReset().mockResolvedValue();
  jest.mocked(logQuickSession).mockReset().mockResolvedValue();
  jest.mocked(deleteSession).mockReset().mockResolvedValue();
  localStorage.clear();
  useWorkoutStore.setState({ active: null, pending: [] });
  mockParams = {};
  jest.mocked(router.push).mockClear();
  jest.mocked(router.navigate).mockClear();
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(menus, 'show')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<Today />', () => {
  describe('the countdown to the next event', () => {
    const event = (values: Partial<CalendarEvent>): CalendarEvent => ({
      id: 'event-1',
      date: '2026-11-14',
      kind: 'hyrox',
      name: 'HYROX Barcelona',
      place: 'Fira de Barcelona',
      notes: null,
      ...values,
    });

    test('shows only the nearest one, with the days left', async () => {
      jest.mocked(fetchEvents).mockResolvedValue([
        event({ id: 'event-0', date: '2026-10-04', name: 'Cursa de la Mercè' }),
        event({ id: 'event-2', date: '2026-12-06', kind: 'marathon', name: null }),
        event({}),
      ]);
      await render(<Today />, { wrapper: createAppWrapper() });

      expect(
        await screen.findByLabelText(
          "Proper esdeveniment: HYROX Barcelona, Dissabte, 14 de novembre, d'aquí a 25 dies",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('25')).toBeOnTheScreen();
      expect(screen.getByText('dies')).toBeOnTheScreen();
      expect(screen.getByText('Dissabte, 14 de novembre · Fira de Barcelona')).toBeOnTheScreen();
      expect(screen.queryByText('Marató')).not.toBeOnTheScreen();
      expect(screen.queryByText('Cursa de la Mercè')).not.toBeOnTheScreen();
    });

    test('says "Demà" the day before, and uses the kind’s name when it has none', async () => {
      jest.mocked(fetchEvents).mockResolvedValue([
        event({ date: '2026-10-21', kind: 'marathon', name: null, place: null }),
      ]);
      await render(<Today />, { wrapper: createAppWrapper() });

      expect(
        await screen.findByLabelText('Proper esdeveniment: Marató, Dimecres, 21 d’octubre, Demà'),
      ).toBeOnTheScreen();
    });

    test('is not there with none ahead', async () => {
      jest.mocked(fetchEvents).mockResolvedValue([event({ date: '2026-10-04' })]);
      await render(<Today />, { wrapper: createAppWrapper() });

      await screen.findByRole('header', { name: 'També avui' });
      expect(screen.queryByText('Proper esdeveniment')).not.toBeOnTheScreen();
    });

    test("on its day it's the big button, marked done as a workout; the countdown goes on to the next", async () => {
      const user = userEvent.setup();
      jest.mocked(fetchEvents).mockResolvedValue([
        event({ date: '2026-10-20' }),
        event({ id: 'event-2', date: '2026-11-14', kind: 'marathon', name: null, place: null }),
      ]);
      await render(<Today />, { wrapper: createAppWrapper() });

      expect(await screen.findByRole('header', { name: 'HYROX Barcelona' })).toBeOnTheScreen();
      expect(screen.getByText('HYROX · Fira de Barcelona')).toBeOnTheScreen();
      // The day's routine waits under "També avui".
      expect(screen.getByRole('button', { name: 'Opcions de «Tren superior 1»' })).toBeOnTheScreen();
      expect(
        screen.getByLabelText("Proper esdeveniment: Marató, Dissabte, 14 de novembre, d'aquí a 25 dies"),
      ).toBeOnTheScreen();

      await user.press(screen.getByRole('button', { name: 'Marca «HYROX Barcelona» com a fet' }));
      expect(screen.getByRole('header', { name: 'Fet: HYROX Barcelona' })).toBeOnTheScreen();
      await user.type(screen.getByLabelText('Durada (min)'), '75');
      const done = session({
        plannedRoutineId: null,
        routineId: null,
        durationS: 4500,
        plannedEventId: 'event-1',
        eventKind: 'hyrox',
        eventName: 'HYROX Barcelona',
      });
      jest.mocked(fetchSessions).mockResolvedValue([done]);
      await user.press(screen.getByRole('button', { name: 'Desa' }));

      expect(logQuickSession).toHaveBeenCalledWith(done);
      // A workout like any other; the routine is next.
      expect(await screen.findByText('1 de 4 entrenaments aquesta setmana')).toBeOnTheScreen();
      expect(await screen.findByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
      expect(screen.getByRole('checkbox', { name: 'Marca «HYROX Barcelona» com a fet' })).toBeChecked();
    });

    test('on its day it can be skipped, with a reason', async () => {
      const user = userEvent.setup();
      jest
        .mocked(fetchEvents)
        .mockResolvedValue([event({ date: '2026-10-20', kind: 'marathon', name: null })]);
      await render(<Today />, { wrapper: createAppWrapper() });

      sheetChoices.push('Malaltia o lesió');
      await user.press(await screen.findByRole('button', { name: 'Salta «Marató»' }));

      expect(logQuickSession).toHaveBeenCalledWith(
        session({
          plannedRoutineId: null,
          routineId: null,
          status: 'skipped',
          changeReason: 'unwell',
          plannedEventId: 'event-1',
          eventKind: 'marathon',
          eventName: null,
        }),
      );
      expect(await screen.findByText("S'ha saltat «Marató»")).toBeOnTheScreen();
    });

    test('shows on its day even with nothing planned in the week', async () => {
      jest.mocked(fetchRoutines).mockResolvedValue([]);
      jest.mocked(fetchEvents).mockResolvedValue([event({ date: '2026-10-20' })]);
      await render(<Today />, { wrapper: createAppWrapper() });

      expect(await screen.findByRole('header', { name: 'HYROX Barcelona' })).toBeOnTheScreen();
      expect(screen.queryByText(/^Encara no tens rutines/)).not.toBeOnTheScreen();
    });
  });

  test('the date, the routine to start in the big button, and the rest "també avui"', async () => {
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Dimarts, 20 d’octubre')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Avui' })).toBeOnTheScreen();
    expect(await screen.findByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
    expect(screen.getByText('4 exercicis · ~25 min')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Comença «Tren superior 1»' })).toBeOnTheScreen();
    expect(await screen.findByText('0 de 4 entrenaments aquesta setmana')).toBeOnTheScreen();
    // The class, earlier in the day, is under "També avui".
    expect(screen.getByRole('header', { name: 'També avui' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Opcions de «Spinning»' })).toBeOnTheScreen();
    expect(screen.getByText('45 min')).toBeOnTheScreen();
    // This week's sessions, and last Sunday's (for a missed day).
    expect(fetchSessions).toHaveBeenCalledWith('2026-10-18', '2026-10-25');
  });

  test('a class "també avui": its circle marks it done, with its duration and a note', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('checkbox', { name: 'Marca «Spinning» com a fet' }));
    expect(screen.getByRole('header', { name: 'Fet: Spinning' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Durada (min)')).toHaveDisplayValue('45');
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Bona classe');

    const done = session({
      plannedRoutineId: 'spinning',
      routineId: 'spinning',
      durationS: 2700,
      notes: 'Bona classe',
    });
    jest.mocked(fetchSessions).mockResolvedValue([done]);
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(logQuickSession).toHaveBeenCalledWith(done);
    expect(await screen.findByText('✓ Fet · 45 min')).toBeOnTheScreen();
    expect(screen.getByRole('checkbox', { name: 'Marca «Spinning» com a fet' })).toBeChecked();
    expect(screen.getByText('1 de 4 entrenaments aquesta setmana')).toBeOnTheScreen();
  });

  test('a sport planned today: marked done from its circle, with its planned duration', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchWeeklySports).mockResolvedValue([sport({})]);
    await render(<Today />, { wrapper: createAppWrapper() });

    // Its start time in its own column, its length under its name.
    expect(await screen.findByText('19:00')).toBeOnTheScreen();
    expect(screen.getByText('1 h 30 min')).toBeOnTheScreen();
    await user.press(screen.getByRole('checkbox', { name: 'Marca «Pàdel» com a fet' }));
    expect(screen.getByLabelText('Durada (min)').props.value).toBe('90');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(logQuickSession).toHaveBeenCalledWith(
      session({
        plannedRoutineId: null,
        routineId: null,
        durationS: 5400,
        plannedSportId: 'padel',
        sport: 'padel',
      }),
    );
  });

  test('a sport can be skipped from its row, with a reason', async () => {
    const user = userEvent.setup();
    jest
      .mocked(fetchWeeklySports)
      .mockResolvedValue([sport({ id: 'squash', sport: 'other', customName: 'Esquaix' })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Salta', 'Cansament');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Esquaix»' }));

    expect(logQuickSession).toHaveBeenCalledWith(
      session({
        plannedRoutineId: null,
        routineId: null,
        status: 'skipped',
        changeReason: 'tired',
        plannedSportId: 'squash',
        sport: 'other',
        sportName: 'Esquaix',
      }),
    );
  });

  test('Salta → Només salta-la, with a reason, and Desfés takes it back', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    const skipped = session({ routineId: null, status: 'skipped', changeReason: 'no_time' });
    jest.mocked(fetchSessions).mockResolvedValue([skipped]);
    sheetChoices.push('Només salta-la', 'Falta de temps');
    await user.press(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' }));

    expect(logQuickSession).toHaveBeenCalledWith(skipped);
    expect(await screen.findByText('Saltat · Falta de temps')).toBeOnTheScreen();

    jest.mocked(fetchSessions).mockResolvedValue([]);
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(deleteSession).toHaveBeenCalledWith('session-1');
    expect(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' })).toBeOnTheScreen();
  });

  test('Salta → to the next free day this week, and Desfés puts it back', async () => {
    const user = userEvent.setup();
    keepMoves();
    await render(<Today />, { wrapper: createAppWrapper() });

    // Wednesday has nothing planned.
    sheetChoices.push('Mou-la a dimecres');
    await user.press(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' }));
    expect(lastSheet()).toEqual([
      'Mou-la a dimecres',
      'Desplaça la setmana un dia',
      'Reprograma la setmana…',
      'Només salta-la',
      'Cancel·la',
    ]);

    // From last Sunday to this one; nothing logged as skipped.
    expect(replaceMoves).toHaveBeenCalledWith('2026-10-18', '2026-10-25', [
      { routineId: 'upper', plannedDate: '2026-10-20', movedTo: '2026-10-21', position: 0 },
    ]);
    expect(logQuickSession).not.toHaveBeenCalled();
    expect(await screen.findByText('«Tren superior 1» passa a dimecres')).toBeOnTheScreen();
    // Today, the class is what's left.
    expect(await screen.findByRole('header', { name: 'Spinning' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(replaceMoves).toHaveBeenLastCalledWith('2026-10-18', '2026-10-25', []);
    expect(await screen.findByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
  });

  test('Salta → Reprograma la setmana: drag or "Mou a…", then Desa', async () => {
    const user = userEvent.setup();
    keepMoves();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Reprograma la setmana…');
    await user.press(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' }));
    expect(await screen.findByRole('header', { name: 'Reprograma la setmana' })).toBeOnTheScreen();
    // Today to Sunday ("Avui" is the screen's title too), with today's two
    // and Friday's upper body.
    expect(screen.getAllByRole('header', { name: 'Avui' })).toHaveLength(2);
    for (const title of ['Demà', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge']) {
      expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    }
    const moveButtons = screen.getAllByRole('button', {
      name: 'Mou «Tren superior 1» a un altre dia',
    });
    expect(moveButtons).toHaveLength(2);

    // Today's upper body to Thursday, by the menu…
    sheetChoices.push('Dijous');
    await user.press(moveButtons[0]);
    // …and the class, dragged under Saturday's heading: [Avui, Spinning,
    // Demà, Dijous, upper, Divendres, upper, Dissabte, Diumenge].
    await drop(1, 7);
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(replaceMoves).toHaveBeenCalledWith('2026-10-18', '2026-10-25', [
      { routineId: 'upper', plannedDate: '2026-10-20', movedTo: '2026-10-22', position: 0 },
      { routineId: 'spinning', plannedDate: '2026-10-20', movedTo: '2026-10-24', position: 0 },
    ]);
    expect(await screen.findByText('Setmana reprogramada')).toBeOnTheScreen();
    // Nothing left today.
    expect(await screen.findByRole('header', { name: 'Dia de descans' })).toBeOnTheScreen();
  });

  test('Reprograma la setmana without changes saves nothing', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Reprograma la setmana…');
    await user.press(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' }));
    await user.press(await screen.findByRole('button', { name: 'Desa' }));

    expect(replaceMoves).not.toHaveBeenCalled();
    expect(screen.queryByRole('header', { name: 'Reprograma la setmana' })).not.toBeOnTheScreen();
  });

  describe('missed yesterday', () => {
    // Legs were on Monday; the account is older than that.
    const mondayLegs = routine('legs', 'Cames', { 1: 0 });
    beforeEach(() => {
      jest.mocked(fetchRoutines).mockResolvedValue([upper, spinning, mondayLegs]);
      jest.mocked(fetchProfile).mockResolvedValue({
        username: 'alba',
        weekly_goal: 4,
        created_at: '2026-10-01T10:00:00Z',
      } as Profile);
    });

    test('"Fes-la avui" brings it to today, after today\'s own, and the card goes', async () => {
      const user = userEvent.setup();
      keepMoves();
      await render(<Today />, { wrapper: createAppWrapper() });

      expect(await screen.findByRole('header', { name: 'Ahir no vas fer «Cames»' })).toBeOnTheScreen();
      expect(screen.getByText('La fas avui?')).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Fes-la avui' }));

      // After the class (0) and upper body (1).
      expect(replaceMoves).toHaveBeenCalledWith('2026-10-18', '2026-10-25', [
        { routineId: 'legs', plannedDate: '2026-10-19', movedTo: '2026-10-20', position: 2 },
      ]);
      expect(await screen.findByText('«Cames» passa a avui')).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'Ahir no vas fer «Cames»' })).not.toBeOnTheScreen();
      expect(screen.getByText('Cames')).toBeOnTheScreen();
    });

    test('skipped on purpose ("Només salta-la") is an answer already: no card', async () => {
      jest
        .mocked(fetchSessions)
        .mockResolvedValue([
          session({ date: '2026-10-19', plannedRoutineId: 'legs', routineId: null, status: 'skipped' }),
        ]);
      await render(<Today />, { wrapper: createAppWrapper() });

      await screen.findByRole('header', { name: 'Tren superior 1' });
      expect(screen.queryByText(/Ahir no vas fer/)).not.toBeOnTheScreen();
      // Last Sunday and this week's sessions, for yesterday's.
      expect(fetchSessions).toHaveBeenCalledWith('2026-10-18', '2026-10-25');
    });

    test('not for a day before the account existed', async () => {
      jest.mocked(fetchProfile).mockResolvedValue({
        username: 'alba',
        weekly_goal: 4,
        created_at: '2026-10-20T08:00:00Z',
      } as Profile);
      await render(<Today />, { wrapper: createAppWrapper() });

      await screen.findByRole('header', { name: 'Tren superior 1' });
      expect(screen.queryByText(/Ahir no vas fer/)).not.toBeOnTheScreen();
    });

    test('"Altres opcions" → "Deixa-ho" logs it skipped, yesterday', async () => {
      const user = userEvent.setup();
      keepLogged();
      await render(<Today />, { wrapper: createAppWrapper() });

      sheetChoices.push('Deixa-ho');
      await user.press(await screen.findByRole('button', { name: 'Altres opcions' }));
      expect(lastSheet()).toEqual([
        'Mou-la a dimecres',
        'Desplaça la setmana un dia',
        'Reprograma la setmana…',
        'Deixa-ho',
        'Cancel·la',
      ]);
      expect(logQuickSession).toHaveBeenCalledWith(
        session({ date: '2026-10-19', plannedRoutineId: 'legs', routineId: null, status: 'skipped' }),
      );
      await waitFor(() => expect(screen.queryByText(/Ahir no vas fer/)).not.toBeOnTheScreen());
    });

    test('"Altres opcions" → shift the week from yesterday; what\'s done today stays', async () => {
      const user = userEvent.setup();
      // The class is done already.
      jest
        .mocked(fetchSessions)
        .mockResolvedValue([session({ plannedRoutineId: 'spinning', routineId: 'spinning' })]);
      await render(<Today />, { wrapper: createAppWrapper() });

      sheetChoices.push('Desplaça la setmana un dia');
      await user.press(await screen.findByRole('button', { name: 'Altres opcions' }));

      const [, , moves] = jest.mocked(replaceMoves).mock.lastCall ?? [];
      expect(moves).toEqual([
        { routineId: 'legs', plannedDate: '2026-10-19', movedTo: '2026-10-20', position: 0 },
        { routineId: 'upper', plannedDate: '2026-10-20', movedTo: '2026-10-21', position: 1 },
        { routineId: 'upper', plannedDate: '2026-10-23', movedTo: '2026-10-24', position: 0 },
      ]);
    });

    test('"Altres opcions" → Reprograma: it starts under today', async () => {
      const user = userEvent.setup();
      await render(<Today />, { wrapper: createAppWrapper() });

      sheetChoices.push('Reprograma la setmana…');
      await user.press(await screen.findByRole('button', { name: 'Altres opcions' }));
      expect(screen.getByRole('button', { name: 'Mou «Cames» a un altre dia' })).toBeOnTheScreen();
      await user.press(screen.getByRole('button', { name: 'Desa' }));

      expect(replaceMoves).toHaveBeenCalledWith('2026-10-18', '2026-10-25', [
        { routineId: 'legs', plannedDate: '2026-10-19', movedTo: '2026-10-20', position: 2 },
      ]);
    });
  });

  test('Salta → shift the week: it and everything after it a day on', async () => {
    const user = userEvent.setup();
    keepMoves();
    // Sunday: a long run, which drops off.
    jest
      .mocked(fetchRoutines)
      .mockResolvedValue([upper, spinning, legs, routine('run', 'Tirada llarga', { 7: 0 })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Desplaça la setmana un dia');
    await user.press(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' }));

    const [, , moves] = jest.mocked(replaceMoves).mock.lastCall ?? [];
    expect(moves).toEqual(
      expect.arrayContaining([
        // Tuesday's to Wednesday; Friday's to Saturday; Sunday's off the week.
        { routineId: 'upper', plannedDate: '2026-10-20', movedTo: '2026-10-21', position: 1 },
        { routineId: 'upper', plannedDate: '2026-10-23', movedTo: '2026-10-24', position: 0 },
        { routineId: 'run', plannedDate: '2026-10-25', movedTo: null, position: 0 },
      ]),
    );
    // The class done earlier today stays.
    expect(moves).toHaveLength(3);
    expect(
      await screen.findByText('Setmana desplaçada. «Tirada llarga» queda fora aquesta setmana.'),
    ).toBeOnTheScreen();
  });

  test('Canvia swaps the routine for today, kept after closing, and back again', async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Today />, { wrapper: createAppWrapper() });

    // Another routine, chosen in its own sheet; the reason is asked there.
    sheetChoices.push('Una altra rutina');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
    expect(actionSheet.mock.lastCall?.[0].options).toEqual([
      'Una altra rutina',
      'Un esport',
      'Cancel·la',
    ]);
    expect(screen.getByRole('header', { name: 'Tria una rutina' })).toBeOnTheScreen();
    // Not the planned routine itself.
    expect(screen.queryByRole('button', { name: /^Tren superior 1/ })).not.toBeOnTheScreen();
    sheetChoices.push('Cansament');
    await user.press(screen.getByRole('button', { name: /^Cames/ }));
    // A swap always has a reason (or is cancelled).
    expect(actionSheet.mock.lastCall?.[0].options).not.toContain('Sense motiu');

    expect(screen.queryByRole('header', { name: 'Tria una rutina' })).not.toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Cames' })).toBeOnTheScreen();
    expect(screen.getByText('En lloc de «Tren superior 1»')).toBeOnTheScreen();

    // Closing and opening the app keeps it.
    await unmount();
    await render(<Today />, { wrapper: createAppWrapper() });
    expect(await screen.findByText('En lloc de «Tren superior 1»')).toBeOnTheScreen();

    // It starts with the reason.
    await user.press(screen.getByRole('button', { name: 'Comença «Cames»' }));
    expect(useWorkoutStore.getState().active).toMatchObject({
      plannedRoutineId: 'upper',
      routineId: 'legs',
      changeReason: 'tired',
    });
  });

  test('Canvia back to the planned routine', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Una altra rutina');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
    sheetChoices.push('Falta de temps');
    await user.press(screen.getByRole('button', { name: /^Cames/ }));
    // Once swapped, Canvia also offers the plan back.
    sheetChoices.push('Torna a «Tren superior 1»');
    await user.press(screen.getByRole('button', { name: 'Canvia «Cames»' }));

    expect(screen.queryByText('En lloc de «Tren superior 1»')).not.toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
  });

  test('Canvia → Una altra rutina → a new one, swapped in once it is saved', async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Una altra rutina');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
    await user.press(screen.getByRole('button', { name: 'Crea una rutina nova' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/new',
      params: { swapFor: 'upper' },
    });
    await unmount();

    // The editor comes back with the new routine's id, and the planned one.
    mockParams = { swap: 'legs', swapFor: 'upper' };
    sheetChoices.push('Cansament');
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: 'Cames' })).toBeOnTheScreen();
    expect(screen.getByText('En lloc de «Tren superior 1»')).toBeOnTheScreen();
    expect(router.setParams).toHaveBeenCalledWith({ swap: undefined, swapFor: undefined });
  });

  test('Canvia → a sport takes the routine’s place, and is logged in its place', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Un esport');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
    expect(screen.getByRole('header', { name: 'Tria un esport' })).toBeOnTheScreen();
    // Only which sport: how long comes when it's done.
    expect(screen.queryByLabelText('Durada (min)')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Pàdel' }));
    sheetChoices.push('Cansament');
    await user.press(screen.getByRole('button', { name: 'Tria' }));

    expect(screen.getByRole('header', { name: 'Pàdel' })).toBeOnTheScreen();
    expect(screen.getByText('En lloc de «Tren superior 1»')).toBeOnTheScreen();
    // Marked done like a planned sport: in the routine's place, with the reason.
    await user.press(screen.getByRole('button', { name: 'Marca «Pàdel» com a fet' }));
    await user.type(screen.getByLabelText('Durada (min)'), '60');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(logQuickSession).toHaveBeenCalledWith(
      session({
        plannedRoutineId: 'upper',
        routineId: null,
        durationS: 3600,
        changeReason: 'tired',
        sport: 'padel',
      }),
    );
  });

  test('once everything is logged, its row says how it went and opens it', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', { 2: 0 })]);
    jest.mocked(fetchSessions).mockResolvedValue([session({ durationS: 3600 })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('1 h')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Comença/ })).not.toBeOnTheScreen();
    // Saved, so it has its page (where it can be deleted, with Desfés).
    await user.press(screen.getByRole('button', { name: /^Tren superior 1/ }));

    expect(router.push).toHaveBeenCalledWith(
      { pathname: '/profile/history/[sessionId]', params: { sessionId: 'session-1' } },
      { withAnchor: true },
    );
  });

  test('a done day lists a skipped activity greyed, with its Desfés', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchSessions).mockResolvedValue([
      session({ id: 'session-2', plannedRoutineId: 'spinning', routineId: null, status: 'skipped', changeReason: 'no_time' }),
      session({ durationS: 3600 }),
    ]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Saltat · Falta de temps')).toBeOnTheScreen();
    sheetChoices.push('Desfés');
    await user.press(screen.getByRole('button', { name: /^Spinning/ }));

    expect(deleteSession).toHaveBeenCalledWith('session-2');
  });

  test('Comença copies the routine into a workout and opens it', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Comença «Tren superior 1»' }));

    expect(useWorkoutStore.getState().active).toMatchObject({
      date: '2026-10-20',
      plannedRoutineId: 'upper',
      routineId: 'upper',
      routineName: 'Tren superior 1',
    });
    // Each exercise's rest is fixed in: your own default, else the app's.
    expect(useWorkoutStore.getState().active?.exercises.map((e) => e.restS)).toEqual([
      150, 90, 90, 90,
    ]);
    expect(ensureNotificationPermission).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/workout');
  });

  test('Previsualitza lists its exercises, and can start it from there', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Previsualitza «Tren superior 1»' }));
    expect(screen.getByText('Tracció al pit')).toBeOnTheScreen();
    expect(screen.getAllByText('3 sèries')).toHaveLength(4);
    await user.press(screen.getByRole('button', { name: 'Comença' }));

    expect(useWorkoutStore.getState().active).toMatchObject({ routineId: 'upper' });
  });

  test('a workout going shows "Reprèn", and no second one can start', async () => {
    const user = userEvent.setup();
    useWorkoutStore.setState({
      active: workoutFromRoutine(upper, {
        date: '2026-10-20',
        plannedRoutineId: 'upper',
        changeReason: null,
        startedAt: new Date().toISOString(),
        newId: () => Math.random().toString(),
        defaultRestS: () => 90,
      }),
    });
    await render(<Today />, { wrapper: createAppWrapper() });

    // The banner: what's going and for how long, one tap back in.
    expect(await screen.findByText('En curs · Tren superior 1')).toBeOnTheScreen();
    const banner = screen.getByRole('button', {
      name: /^Reprèn «Tren superior 1», en curs des de fa 0:\d\d$/,
    });
    expect(banner).toHaveTextContent(/0:\d\d/);
    expect(screen.getByRole('button', { name: 'Comença «Tren superior 1»' })).toHaveTextContent(
      /Reprèn/,
    );

    sheetChoices.push('Una rutina');
    await user.press(screen.getByRole('button', { name: 'Registra una altra activitat' }));
    await user.press(screen.getByRole('button', { name: /^Cames/ }));
    expect(screen.getByText('Ja tens un entrenament en marxa.')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();

    await user.press(banner);
    expect(router.push).toHaveBeenCalledWith('/workout');
  });

  test('+ starts any routine, unplanned, or a new one', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Una rutina');
    await user.press(await screen.findByRole('button', { name: 'Registra una altra activitat' }));
    expect(actionSheet.mock.lastCall?.[0].options).toEqual(['Una rutina', 'Un esport', 'Cancel·la']);

    // A class isn't offered: there's nothing to log set by set.
    expect(screen.getByRole('button', { name: /^Tren superior 1/ })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Spinning/ })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Crea una rutina nova' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: /^Cames/ }));

    expect(useWorkoutStore.getState().active).toMatchObject({
      plannedRoutineId: null,
      routineId: 'legs',
    });
  });

  test('+ → "Crea una rutina nova" opens the editor, and the routine starts once saved', async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Una rutina');
    await user.press(await screen.findByRole('button', { name: 'Registra una altra activitat' }));
    await user.press(screen.getByRole('button', { name: 'Crea una rutina nova' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/new',
      params: { start: '1' },
    });
    await unmount();

    // The editor comes back with the new routine's id.
    mockParams = { start: 'legs' };
    await render(<Today />, { wrapper: createAppWrapper() });

    await waitFor(() =>
      expect(useWorkoutStore.getState().active).toMatchObject({
        plannedRoutineId: null,
        routineId: 'legs',
      }),
    );
    expect(router.setParams).toHaveBeenCalledWith({ start: undefined });
    expect(router.push).toHaveBeenLastCalledWith('/workout');
  });

  test('+ → a sport done today, not planned', async () => {
    const user = userEvent.setup();
    keepLogged();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Un esport');
    await user.press(await screen.findByRole('button', { name: 'Registra una altra activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Ioga' }));
    await user.type(screen.getByLabelText('Durada (min)'), '30');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(logQuickSession).toHaveBeenCalledWith(
      session({
        plannedRoutineId: null,
        routineId: null,
        durationS: 1800,
        sport: 'yoga',
      }),
    );
    // Then it's under "També avui", done.
    expect(await screen.findByText('✓ Fet · 30 min')).toBeOnTheScreen();
  });

  test('a walk shows under "També avui" but is no workout for the week', async () => {
    jest.mocked(fetchSessions).mockResolvedValue([
      session({ plannedRoutineId: null, routineId: null, sport: 'walking', durationS: 1800 }),
    ]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Caminar')).toBeOnTheScreen();
    expect(screen.getByText('✓ Fet · 30 min')).toBeOnTheScreen();
    expect(screen.getByText('0 de 4 entrenaments aquesta setmana')).toBeOnTheScreen();
  });

  test('a finished workout not saved yet already counts as done', async () => {
    const workout = workoutFromRoutine(upper, {
      date: '2026-10-20',
      plannedRoutineId: 'upper',
      changeReason: null,
      startedAt: '2026-10-20T07:00:00.000Z',
      newId: () => Math.random().toString(),
      defaultRestS: () => 90,
    });
    useWorkoutStore.setState({
      pending: [{ ...workout, endedAt: '2026-10-20T08:00:00.000Z', energy: null, notes: null }],
    });
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('✓ Fet · 1 h')).toBeOnTheScreen();
    expect(screen.getByText('1 de 4 entrenaments aquesta setmana')).toBeOnTheScreen();
  });

  test('all done: "Tot fet", the day in numbers, each activity under "Completat", and what is next', async () => {
    const user = userEvent.setup();
    // The class ("Fet", 45 min) and the upper-body workout, both done.
    jest.mocked(fetchSessions).mockResolvedValue([
      session({ id: 'session-2', plannedRoutineId: 'spinning', routineId: 'spinning', durationS: 2700 }),
      session({ logMode: 'live', durationS: 3900, startedAt: new Date(2026, 9, 20, 18, 10).toISOString() }),
    ]);
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({ id: 'session-2', routineName: 'Spinning', routineId: 'spinning', routineLabel: 'class', logMode: 'quick', durationS: 2700, exercises: 0, sets: 0, volumeKg: 0 }),
      entry({}),
      // Last time, a week ago: 5.000 kg, so today's 5.200 is 4 % more.
      entry({ id: 'session-0', date: '2026-10-13', volumeKg: 5000 }),
    ]);
    await render(<Today />, { wrapper: createAppWrapper() });

    // No step counter here: steps can't hold it back.
    expect(await screen.findByRole('header', { name: 'Tot fet' })).toBeOnTheScreen();
    expect(screen.getByText('2 de 2 planificades · 2 de 4 aquesta setmana')).toBeOnTheScreen();
    // 45 min + 1 h 5 min, the weight lifted and the sets.
    expect(await screen.findByLabelText('Temps: 1 h 50 min')).toBeOnTheScreen();
    expect(screen.getByLabelText('Volum: 5.200 kg')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sèries: 12')).toBeOnTheScreen();
    expect(screen.getByLabelText('Passos: —')).toBeOnTheScreen();
    // Under "Completat": when it started, how long it took, and against
    // last time.
    expect(screen.getByRole('header', { name: 'Completat' })).toBeOnTheScreen();
    expect(screen.getByText('45 min')).toBeOnTheScreen();
    expect(screen.getByText(/^18:10 · 1 h 5 min · \+4\s%\svs l'última vegada$/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Comença «Tren superior 1»' })).not.toBeOnTheScreen();

    // A workout opens its page, on top of Perfil's.
    await user.press(screen.getByRole('button', { name: /^Tren superior 1/ }));
    expect(router.push).toHaveBeenCalledWith(
      { pathname: '/profile/history/[sessionId]', params: { sessionId: 'session-1' } },
      { withAnchor: true },
    );

    // What's next: Friday's upper body, to look at, not to start today.
    await user.press(screen.getByRole('button', { name: /^Divendres/ }));
    expect(screen.getByText('Tracció al pit')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Comença' })).not.toBeOnTheScreen();
  });

  test('activities done, steps to go: "Gairebé fet", with the steps in the numbers', async () => {
    stepsCounted(7860);
    jest
      .mocked(fetchProfile)
      .mockResolvedValue({ username: 'alba', weekly_goal: 4, daily_step_goal: 10000 } as Profile);
    jest.mocked(fetchSessions).mockResolvedValue([
      session({ id: 'session-2', plannedRoutineId: 'spinning', routineId: 'spinning', durationS: 2700 }),
      session({ durationS: 3600 }),
    ]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: 'Gairebé fet' })).toBeOnTheScreen();
    expect(screen.getByText('2.140 passos per arribar')).toBeOnTheScreen();
    expect(screen.getByLabelText('Passos: 7.860 / 10.000')).toBeOnTheScreen();
  });

  test('a day without weights: its numbers say so, and nothing to compare', async () => {
    jest.mocked(fetchSessions).mockResolvedValue([
      session({ id: 'session-2', plannedRoutineId: 'spinning', routineId: 'spinning', durationS: 2700 }),
      session({ durationS: 3600 }),
    ]);
    jest.mocked(fetchHistoryEntries).mockResolvedValue([
      entry({ id: 'session-2', logMode: 'quick', durationS: 2700, exercises: 0, sets: 0, volumeKg: 0 }),
      entry({ logMode: 'quick', durationS: 3600, exercises: 0, sets: 0, volumeKg: 0 }),
    ]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByLabelText('Temps: 1 h 45 min')).toBeOnTheScreen();
    expect(screen.getByLabelText('Volum: —')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sèries: —')).toBeOnTheScreen();
    expect(screen.queryByText(/vs l'última vegada/)).not.toBeOnTheScreen();
  });

  test('all skipped is not "Tot fet"', async () => {
    jest.mocked(fetchSessions).mockResolvedValue([
      session({ id: 'session-2', plannedRoutineId: 'spinning', routineId: null, status: 'skipped' }),
      session({ routineId: null, status: 'skipped' }),
    ]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findAllByText('Saltat')).not.toHaveLength(0);
    expect(screen.queryByRole('header', { name: 'Tot fet' })).not.toBeOnTheScreen();
  });

  test('a rest day: a word on recovery, what comes next, and a quick walk', async () => {
    const user = userEvent.setup();
    // Thursday: upper body, then padel. Nothing on Tuesday or Wednesday.
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', { 4: 0 })]);
    jest.mocked(fetchWeeklySports).mockResolvedValue([sport({ weekday: 4, position: 1 })]);
    keepLogged();
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: 'Dia de descans' })).toBeOnTheScreen();
    // One of three messages, a different one each day.
    expect(screen.getByText('Dorm bé, menja bé i beu aigua. Demà ho notaràs.')).toBeOnTheScreen();
    expect(screen.getByText('Dijous')).toBeOnTheScreen();
    expect(screen.getByText('Tren superior 1 · Pàdel 19:00')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Registra «Caminar»' }));
    await user.type(screen.getByLabelText('Durada (min)'), '40');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(logQuickSession).toHaveBeenCalledWith(
      session({ plannedRoutineId: null, routineId: null, durationS: 2400, sport: 'walking' }),
    );
    expect(await screen.findByText('✓ Fet · 40 min')).toBeOnTheScreen();
  });

  test('a rest day before a planned one says "Demà"', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', { 3: 0 })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Demà')).toBeOnTheScreen();
    expect(screen.getByText('Tren superior 1')).toBeOnTheScreen();
  });

  test('with nothing planned all week, points to Pla → Setmana', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', {})]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText(/Pla → Setmana/)).toBeOnTheScreen();
  });
});
