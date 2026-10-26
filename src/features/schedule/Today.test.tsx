import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ActionSheetIOS } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
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

import type { WeeklySport } from './sports';
import { fetchWeeklySports } from './sportsApi';
import { Today } from './Today';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('@/features/profile/api', () => ({ fetchProfile: jest.fn() }));
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
jest.mock('@/lib/notifications', () => ({ ensureNotificationPermission: jest.fn() }));
jest.mock('@/features/workout/api', () => ({
  fetchSessions: jest.fn(),
  logQuickSession: jest.fn(),
  deleteSession: jest.fn(),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'session-1' }));
// The screen's link parameters, e.g. { start } from the routine editor.
let mockParams: { start?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
// Today is Tuesday 20 October 2026.
jest.mock('./useToday', () => ({ useToday: () => new Date(2026, 9, 20) }));
jest.mock('./sportsApi', () => ({ fetchWeeklySports: jest.fn() }));

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
  ...fields,
});

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
  jest.mocked(fetchWeeklySports).mockResolvedValue([]);
  jest.mocked(logQuickSession).mockReset().mockResolvedValue();
  jest.mocked(deleteSession).mockReset().mockResolvedValue();
  localStorage.clear();
  useWorkoutStore.setState({ active: null, pending: [] });
  mockParams = {};
  jest.mocked(router.push).mockClear();
  jest.mocked(router.navigate).mockClear();
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<Today />', () => {
  test('the date, the routine to start in the big button, and the rest "també avui"', async () => {
    const user = userEvent.setup();
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
    // This week's sessions, Monday to Sunday.
    expect(fetchSessions).toHaveBeenCalledWith('2026-10-19', '2026-10-25');

    await user.press(screen.getByRole('button', { name: 'Perfil' }));
    expect(router.navigate).toHaveBeenCalledWith('/profile');
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

    expect(await screen.findByText('19:00 · 1 h 30 min')).toBeOnTheScreen();
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

  test('Salta skips the main routine with a reason, and Desfés takes it back', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    const skipped = session({ routineId: null, status: 'skipped', changeReason: 'no_time' });
    jest.mocked(fetchSessions).mockResolvedValue([skipped]);
    sheetChoices.push('Falta de temps');
    await user.press(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' }));

    expect(logQuickSession).toHaveBeenCalledWith(skipped);
    expect(await screen.findByText('Saltat · Falta de temps')).toBeOnTheScreen();

    jest.mocked(fetchSessions).mockResolvedValue([]);
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(deleteSession).toHaveBeenCalledWith('session-1');
    expect(await screen.findByRole('button', { name: 'Salta «Tren superior 1»' })).toBeOnTheScreen();
  });

  test('Canvia swaps the routine for today, kept after closing, and back again', async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Cames', 'Cansament');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
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

    sheetChoices.push('Cames', 'Sense motiu');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
    sheetChoices.push('Tren superior 1');
    await user.press(screen.getByRole('button', { name: 'Canvia «Cames»' }));

    expect(screen.queryByText('En lloc de «Tren superior 1»')).not.toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
  });

  test('once everything is logged, the big button shows how it went; ⋯ → Desfés', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', { 2: 0 })]);
    jest.mocked(fetchSessions).mockResolvedValue([session({ durationS: 3600 })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('✓ Fet · 1 h')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Comença/ })).not.toBeOnTheScreen();
    sheetChoices.push('Desfés');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tren superior 1»' }));

    expect(deleteSession).toHaveBeenCalledWith('session-1');
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

    expect(await screen.findByText('En marxa: Tren superior 1')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Comença «Tren superior 1»' })).toHaveTextContent(
      'Reprèn',
    );

    sheetChoices.push('Cames');
    await user.press(screen.getByRole('button', { name: 'Registra una altra activitat' }));
    expect(screen.getByText('Ja tens un entrenament en marxa.')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  test('+ starts any routine, unplanned, or a new one', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Cames');
    await user.press(await screen.findByRole('button', { name: 'Registra una altra activitat' }));

    // A class isn't offered: there's nothing to log set by set.
    expect(actionSheet.mock.lastCall?.[0].options).toEqual([
      'Tren superior 1',
      'Cames',
      'Crea una rutina nova',
      'Registra un esport fet avui',
      'Cancel·la',
    ]);
    expect(useWorkoutStore.getState().active).toMatchObject({
      plannedRoutineId: null,
      routineId: 'legs',
    });
  });

  test('+ → "Crea una rutina nova" opens the editor, and the routine starts once saved', async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Crea una rutina nova');
    await user.press(await screen.findByRole('button', { name: 'Registra una altra activitat' }));
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
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Registra un esport fet avui');
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

  test('a rest day today says so', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', { 4: 0 })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Avui toca descans. Recupera bé!')).toBeOnTheScreen();
  });

  test('with nothing planned all week, points to Pla → Setmana', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', {})]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText(/Pla → Setmana/)).toBeOnTheScreen();
  });
});
