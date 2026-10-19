import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ActionSheetIOS } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchRoutines } from '@/features/routines/api';
import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { workoutFromRoutine } from '@/features/workout/activeWorkout';
import { deleteSession, fetchSessions, logQuickSession } from '@/features/workout/api';
import type { WorkoutSession } from '@/features/workout/session';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import { ensureNotificationPermission } from '@/lib/notifications';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { Today } from './Today';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
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
  router: { push: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
// Today is Tuesday 20 October 2026.
jest.mock('./useToday', () => ({ useToday: () => new Date(2026, 9, 20) }));

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
  jest.mocked(fetchRoutines).mockResolvedValue([upper, spinning, legs]);
  jest.mocked(fetchSessions).mockReset().mockResolvedValue([]);
  jest.mocked(logQuickSession).mockReset().mockResolvedValue();
  jest.mocked(deleteSession).mockReset().mockResolvedValue();
  localStorage.clear();
  useWorkoutStore.setState({ active: null, pending: [] });
  mockParams = {};
  jest.mocked(router.push).mockClear();
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
  test('shows the date, the week, and one card per routine planned today', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Dimarts, 20 d’octubre')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Dimarts 20, 2 rutines' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dijous 22, descans' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Divendres 23, 1 rutina' })).toBeOnTheScreen();

    // Asked for this week's sessions, Monday to Sunday.
    expect(fetchSessions).toHaveBeenCalledWith('2026-10-19', '2026-10-25');

    // In their order on the day: the class first, with its duration.
    const cards = screen.getAllByRole('button', { name: /^(Spinning|Tren superior 1)/ });
    expect(cards[0]).toHaveTextContent(/Spinning.*45 min/);
    expect(cards[1]).toHaveTextContent(/Tren superior 1.*4 exercicis · Tracció al pit/);

    await user.press(cards[1]);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/[id]',
      params: { id: 'upper' },
    });
  });

  test('looks at another day of the week, then back to today; days ahead can’t be logged', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('radio', { name: 'Dijous 22, descans' }));
    expect(screen.getByRole('header', { name: 'Dijous, 22 d’octubre' })).toBeOnTheScreen();
    expect(screen.getByText('Dia de descans.')).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'Divendres 23, 1 rutina' }));
    expect(screen.getByText('Tren superior 1')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /com a fet/ })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Avui' }));
    expect(screen.getByRole('radio', { name: 'Dimarts 20, 2 rutines' })).toBeChecked();
  });

  test('marks a class done with its planned duration and a note', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Marca «Spinning» com a fet' }));
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
    expect(screen.getByText('«Spinning»: fet ✓')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Dimarts 20, fet' })).toBeOnTheScreen();
  });

  test('skips a routine with a reason, and Desfés takes it back', async () => {
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

  test('swaps a routine for today, keeps the swap after closing, and logs both', async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Cames', 'Cansament');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
    expect(screen.getByText('En lloc de «Tren superior 1»')).toBeOnTheScreen();

    // Closing and opening the app keeps it.
    await unmount();
    await render(<Today />, { wrapper: createAppWrapper() });
    expect(await screen.findByText('En lloc de «Tren superior 1»')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Marca «Cames» com a fet' }));
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    expect(logQuickSession).toHaveBeenCalledWith(
      session({ plannedRoutineId: 'upper', routineId: 'legs', changeReason: 'tired' }),
    );
  });

  test('a swap can go back to the plan from ⋯', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Cames', 'Sense motiu');
    await user.press(await screen.findByRole('button', { name: 'Canvia «Tren superior 1»' }));
    sheetChoices.push('Torna a «Tren superior 1»');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Cames»' }));

    expect(screen.queryByText('En lloc de «Tren superior 1»')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Canvia «Tren superior 1»' })).toBeOnTheScreen();
  });

  test('a session already logged shows as done, and ⋯ → Desfés deletes it', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchSessions).mockResolvedValue([session({ durationS: 3600 })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('✓ Fet · 1 h')).toBeOnTheScreen();
    sheetChoices.push('Desfés');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tren superior 1»' }));

    expect(deleteSession).toHaveBeenCalledWith('session-1');
  });

  test('Comença copies the routine into a workout and opens it; a class has no Comença', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(screen.queryByRole('button', { name: 'Comença «Spinning»' })).not.toBeOnTheScreen();
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
    // The card of the workout going says "Reprèn" too.
    expect(screen.getByRole('button', { name: 'Comença «Tren superior 1»' })).toHaveTextContent(
      'Reprèn',
    );

    sheetChoices.push('Cames');
    await user.press(screen.getByRole('button', { name: 'Fes una altra rutina' }));
    expect(screen.getByText('Ja tens un entrenament en marxa.')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();

    await user.press(screen.getAllByRole('button', { name: 'Reprèn' })[0]);
    expect(router.push).toHaveBeenCalledWith('/workout');
  });

  test('"Fes una altra rutina" starts any routine, unplanned', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Cames');
    await user.press(await screen.findByRole('button', { name: 'Fes una altra rutina' }));

    // A class isn't offered: there's nothing to log set by set.
    expect(actionSheet.mock.lastCall?.[0].options).toEqual([
      'Tren superior 1',
      'Cames',
      'Crea una rutina nova',
      'Cancel·la',
    ]);
    expect(useWorkoutStore.getState().active).toMatchObject({
      plannedRoutineId: null,
      routineId: 'legs',
    });
  });

  test('"Crea una rutina nova" opens the editor, and the new routine starts once saved', async () => {
    const user = userEvent.setup();
    const { unmount } = await render(<Today />, { wrapper: createAppWrapper() });

    sheetChoices.push('Crea una rutina nova');
    await user.press(await screen.findByRole('button', { name: 'Fes una altra rutina' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/new',
      params: { start: '1' },
    });
    await unmount();

    // The editor comes back with the new routine's id.
    mockParams = { start: 'legs' };
    await render(<Today />, { wrapper: createAppWrapper() });

    await screen.findByRole('button', { name: 'Fes una altra rutina' });
    expect(useWorkoutStore.getState().active).toMatchObject({
      plannedRoutineId: null,
      routineId: 'legs',
    });
    expect(router.setParams).toHaveBeenCalledWith({ start: undefined });
    expect(router.push).toHaveBeenLastCalledWith('/workout');
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
    useWorkoutStore.setState({ pending: [{ ...workout, endedAt: '2026-10-20T08:00:00.000Z' }] });
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('✓ Fet · 1 h')).toBeOnTheScreen();
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
