import '@/lib/i18n';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { menus } from '@/components/ui';
import { NO_TARGETS, type Routine } from '@/features/routines/routine';
import { cardioExercise, sundayRun, upperBody } from '@/features/routines/testData';
import { cancelScheduled, scheduleAt } from '@/lib/notifications';

import { fetchLastTime, saveNoteToRoutine } from './api';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { workoutFromRoutine } from './activeWorkout';
import { ActiveWorkoutView } from './ActiveWorkoutView';
import { useWorkoutStore } from './workoutStore';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => `rest-${Math.random()}` }));
// Last time: nothing yet, unless a test says otherwise.
jest.mock('./api', () => ({
  fetchLastTime: jest.fn(() => Promise.resolve({})),
  saveNoteToRoutine: jest.fn(() => Promise.resolve()),
}));
// The library, for adding or swapping in an exercise: just the squat.
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('@/features/exercises/api', () => ({
  fetchExercises: jest.fn(() =>
    Promise.resolve([jest.requireActual('@/features/routines/testData').testExercise('squat', 'Esquat')]),
  ),
  fetchExerciseSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock('@/lib/notifications', () => ({
  scheduleAt: jest.fn(() => Promise.resolve('notification-1')),
  cancelScheduled: jest.fn(() => Promise.resolve()),
  setWorkoutScreenOpen: jest.fn(),
}));

// Two exercises: Tracció al pit, 2 × 10 at 40 kg; Rem assegut, 1 set, no plan.
const routine: Routine = {
  ...upperBody,
  exercises: [
    {
      ...upperBody.exercises[0],
      notes: 'Agafada ampla',
      sets: [
        { ...NO_TARGETS, reps: 10, weightKg: 40 },
        { ...NO_TARGETS, reps: 10, weightKg: 40 },
      ],
    },
    { ...upperBody.exercises[1], sets: [NO_TARGETS] },
  ],
};

let ids = 0;
function startWorkout(from: Routine = routine) {
  useWorkoutStore.setState({
    active: workoutFromRoutine(from, {
      date: '2026-10-20',
      plannedRoutineId: 'routine-1',
      changeReason: null,
      startedAt: new Date().toISOString(),
      newId: () => `id-${(ids += 1)}`,
      defaultRestS: () => 90,
    }),
    pending: [],
  });
}

const rest = () => useWorkoutStore.getState().active?.rest;

// Each native action sheet picks the next of these labels.
const sheetChoices: string[] = [];
let actionSheet: jest.SpyInstance;

beforeEach(() => {
  startWorkout();
  jest.mocked(Haptics.impactAsync).mockClear();
  jest.mocked(Haptics.notificationAsync).mockClear();
  jest.mocked(scheduleAt).mockClear();
  jest.mocked(cancelScheduled).mockClear();
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(menus, 'show')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

const active = () => useWorkoutStore.getState().active;

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ActiveWorkoutView />', () => {
  test('opens an exercise’s page over the workout, from its card and its menu', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<ActiveWorkoutView onClose={onClose} />, { wrapper: createAppWrapper() });

    await user.press(
      screen.getByRole('button', { name: 'Mira la informació de Tracció al pit' }),
    );

    // The page, without what changes the exercise; the workout is still there.
    expect(screen.getByRole('button', { name: 'Fet' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: "Esborra l'exercici" })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: "Edita l'exercici" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(active()).not.toBeNull();

    sheetChoices.push("Informació de l'exercici");
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tracció al pit»' }));
    expect(screen.getByRole('button', { name: 'Fet' })).toBeOnTheScreen();
  });

  test('shows each exercise with its note and sets, the plan pre-filled in grey', async () => {
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    expect(screen.getByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Tracció al pit' })).toBeOnTheScreen();
    expect(screen.getByText('Agafada ampla')).toBeOnTheScreen();
    const kg = screen.getByLabelText('kg · Tracció al pit, sèrie 1');
    expect(kg).toHaveDisplayValue('');
    expect(kg.props.placeholder).toBe('40');
    expect(screen.getByLabelText('Reps · Rem assegut amb politja, sèrie 1').props.placeholder).toBe('–');
  });

  test('✓ logs a set as shown, with a soft tap; typed numbers win over the plan', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    await user.type(screen.getByLabelText('kg · Tracció al pit, sèrie 2'), '42,5');
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 2 de «Tracció al pit» feta' }));

    const [first, second] = active()!.exercises[0].sets;
    expect(first).toMatchObject({ typed: { reps: 10, weightKg: 40 } });
    expect(first.completedAt).not.toBeNull();
    expect(second).toMatchObject({ typed: { reps: 10, weightKg: 42.5 } });
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' })).toBeChecked();
    expect(screen.getByText('2/2')).toBeOnTheScreen();

    // Tapped again: not done any more.
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    expect(active()!.exercises[0].sets[0].completedAt).toBeNull();
  });

  test('finishing with sets left asks first, then the summary saves it', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<ActiveWorkoutView onClose={onClose} />, { wrapper: createAppWrapper() });
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    const workoutId = active()!.id;

    sheetChoices.push("Acaba l'entrenament");
    await user.press(screen.getByRole('button', { name: "Acaba l'entrenament" }));

    expect(actionSheet.mock.lastCall?.[0].message).toBe('2 sèries sense ✓ no es desaran.');
    expect(screen.getByRole('header', { name: 'Bona feina!' })).toBeOnTheScreen();
    // Nothing is saved until "Desa".
    expect(active()).not.toBeNull();

    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(onClose).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    const { active: after, pending } = useWorkoutStore.getState();
    expect(after).toBeNull();
    expect(pending.map((workout) => workout.id)).toEqual([workoutId]);
    expect(pending[0]).toMatchObject({ endedAt: expect.any(String), feeling: null, notes: null });
  });

  test('the summary: totals, what beat last time, how it felt and a note', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const lift = (weightKg: number, reps: number) => ({ ...NO_TARGETS, weightKg, reps });
    jest.mocked(fetchLastTime).mockResolvedValueOnce({
      'exercise-1': { routine: [{ routineExerciseId: 're-1', sets: [lift(37.5, 10)] }], any: [] },
    });
    await render(<ActiveWorkoutView onClose={onClose} />, { wrapper: createAppWrapper() });
    await waitFor(() => expect(active()!.lastTimeLoaded).toBe(true));
    // Tracció al pit: 40 kg, then last time's 37,5 kg; Rem assegut skipped.
    await user.type(screen.getByLabelText('kg · Tracció al pit, sèrie 1'), '40');
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 2 de «Tracció al pit» feta' }));
    sheetChoices.push("Salta l'exercici", 'Sense motiu');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Rem assegut amb politja»' }));

    await user.press(screen.getByRole('button', { name: "Acaba l'entrenament" }));

    expect(screen.getByLabelText('Exercicis: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sèries: 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Kg aixecats: 775 kg')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: "Millor que l'últim cop" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Millor que l'últim cop: +2,5 kg")).toBeOnTheScreen();

    // "Torna" goes back to the workout, still going.
    await user.press(screen.getByRole('button', { name: "Torna a l'entrenament" }));
    expect(screen.getByRole('button', { name: "Acaba l'entrenament" })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: "Acaba l'entrenament" }));
    // "Com t'has sentit?": nothing until it's touched; slid to 8 (the line
    // is 330 wide, 16 from the screen's edge), then one step down by VoiceOver.
    const feeling = screen.getByRole('adjustable', { name: "Com t'has sentit?" });
    expect(feeling).toHaveAccessibilityValue({ text: 'Sense puntuar' });
    await fireEvent(feeling, 'layout', { nativeEvent: { layout: { width: 330 } } });
    await fireEvent(feeling, 'responderGrant', { nativeEvent: { pageX: 271, locationX: 255 } });
    expect(feeling).toHaveAccessibilityValue({ now: 8, text: '8 de 10, Molt bé' });
    await fireEvent(feeling, 'responderMove', { nativeEvent: { pageX: 400, locationX: 384 } });
    expect(feeling).toHaveAccessibilityValue({ now: 10, text: '10 de 10, Increïble' });
    await fireEvent(feeling, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await fireEvent(feeling, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    await fireEvent(feeling, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(feeling).toHaveAccessibilityValue({ now: 7 });
    expect(screen.getByText('Bé')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Molt bé ');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    expect(useWorkoutStore.getState().pending[0]).toMatchObject({ feeling: 7, notes: 'Molt bé' });
    expect(onClose).toHaveBeenCalled();
  });

  test('"Continua" keeps going; discarding throws it away', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<ActiveWorkoutView onClose={onClose} />, { wrapper: createAppWrapper() });

    // With no sets done, finishing offers to discard.
    sheetChoices.push('Continua');
    await user.press(screen.getByRole('button', { name: "Acaba l'entrenament" }));
    expect(active()).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    sheetChoices.push("Descarta l'entrenament");
    await user.press(screen.getByRole('button', { name: "Descarta l'entrenament" }));
    expect(useWorkoutStore.getState()).toMatchObject({ active: null, pending: [] });
    expect(onClose).toHaveBeenCalled();
  });

  test('after ✓, rest starts: a countdown, what comes next, and a notification for its end', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));

    expect(screen.getByText('Descans · Següent: Tracció al pit, sèrie 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Descans: 1:30')).toBeOnTheScreen();
    const [date, title, body] = jest.mocked(scheduleAt).mock.lastCall!;
    expect(date.getTime() - Date.now()).toBeGreaterThan(85_000);
    expect(title).toBe("S'ha acabat el descans");
    expect(body).toBe('Següent: Tracció al pit, sèrie 2');
    await waitFor(() => expect(rest()?.notificationId).toBe('notification-1'));

    // +15 s moves the end, and the notification with it.
    await user.press(screen.getByRole('button', { name: 'Afegeix 15 segons de descans' }));
    expect(screen.getByLabelText('Descans: 1:45')).toBeOnTheScreen();
    expect(cancelScheduled).toHaveBeenCalledWith('notification-1');
    expect(scheduleAt).toHaveBeenCalledTimes(2);

    // Paused: no notification until it carries on.
    await user.press(screen.getByRole('button', { name: 'Pausa' }));
    expect(rest()?.endsAt).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Continua' }));
    expect(rest()?.endsAt).not.toBeNull();

    await user.press(screen.getByRole('button', { name: 'Salta el descans' }));
    expect(rest()).toBeNull();
    expect(screen.queryByText(/Descans · /)).not.toBeOnTheScreen();
  });

  test('in a superset, no rest until the end of the round', async () => {
    const user = userEvent.setup();
    useWorkoutStore.setState({
      active: workoutFromRoutine(
        {
          ...routine,
          exercises: routine.exercises.map((item) => ({ ...item, groupKey: 'g1', restS: 60 })),
        },
        {
          date: '2026-10-20',
          plannedRoutineId: null,
          changeReason: null,
          startedAt: new Date().toISOString(),
          newId: () => `id-${(ids += 1)}`,
          defaultRestS: () => 90,
        },
      ),
    });
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    expect(screen.getByRole('header', { name: 'Superset' })).toBeOnTheScreen();
    expect(screen.getByText('Ronda 1 de 2')).toBeOnTheScreen();

    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    expect(rest()).toBeNull();

    await user.press(
      screen.getByRole('checkbox', { name: 'Sèrie 1 de «Rem assegut amb politja» feta' }),
    );
    expect(screen.getByText('Descans · Següent: Tracció al pit, sèrie 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Descans: 1:00')).toBeOnTheScreen();
    expect(screen.getByText('Ronda 2 de 2')).toBeOnTheScreen();
  });

  test('when rest ends it vibrates and goes; one that ended long ago just goes', async () => {
    const workout = useWorkoutStore.getState().active!;
    const ended = (msAgo: number) => ({
      id: 'rest-1',
      totalS: 90,
      endsAt: new Date(Date.now() - msAgo).toISOString(),
      pausedRemainingMs: null,
      next: null,
      notificationId: 'notification-1',
    });

    useWorkoutStore.setState({ active: { ...workout, rest: ended(500) } });
    const { unmount } = await render(<ActiveWorkoutView onClose={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    await waitFor(() => expect(rest()).toBeNull());
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    await unmount();

    jest.mocked(Haptics.notificationAsync).mockClear();
    // Ended while the app was closed: its notification already went off.
    useWorkoutStore.setState({ active: { ...workout, rest: ended(10 * 60_000) } });
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });
    await waitFor(() => expect(rest()).toBeNull());
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  test('finishing cancels a rest that’s still running', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    await waitFor(() => expect(rest()?.notificationId).toBe('notification-1'));

    sheetChoices.push("Acaba l'entrenament");
    await user.press(screen.getByRole('button', { name: "Acaba l'entrenament" }));

    expect(cancelScheduled).toHaveBeenCalledWith('notification-1');
  });

  test('pre-fills from last time in this routine, and compares once the sets are done', async () => {
    const user = userEvent.setup();
    const lift = (weightKg: number, reps: number) => ({ ...NO_TARGETS, weightKg, reps });
    jest.mocked(fetchLastTime).mockResolvedValueOnce({
      'exercise-1': { routine: [{ routineExerciseId: 're-1', sets: [lift(42.5, 10), lift(42.5, 8)] }], any: [] },
    });
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    // Last time's numbers replace the plan's (40 kg).
    await waitFor(() =>
      expect(screen.getByLabelText('kg · Tracció al pit, sèrie 1').props.placeholder).toBe('42,5'),
    );
    expect(screen.getByLabelText('Reps · Tracció al pit, sèrie 2').props.placeholder).toBe('8');
    expect(fetchLastTime).toHaveBeenCalledWith('routine-1', ['exercise-1', 'exercise-2']);

    // 45 kg in the first set, then both done: better than last time.
    await user.type(screen.getByLabelText('kg · Tracció al pit, sèrie 1'), '45');
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 2 de «Tracció al pit» feta' }));

    expect(screen.getByLabelText("Millor que l'últim cop: +2,5 kg")).toBeOnTheScreen();
    expect(screen.getByText('↑ +2,5 kg ✨')).toBeOnTheScreen();
  });

  test('a set’s menu: drop set, RPE, and removing it', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });
    const setMenu = (number: number) =>
      screen.getByRole('button', { name: `Opcions de la sèrie ${number} de «Tracció al pit»` });

    sheetChoices.push('Sèrie de descàrrega');
    await user.press(setMenu(2));
    expect(setMenu(2)).toHaveTextContent('D');

    sheetChoices.push('Afegeix RPE', '8,5');
    await user.press(setMenu(2));
    expect(setMenu(2)).toHaveTextContent('D@8,5');
    expect(active()!.exercises[0].sets[1]).toMatchObject({ setType: 'drop', rpe: 8.5 });

    sheetChoices.push('Treu la sèrie');
    await user.press(setMenu(1));
    expect(active()!.exercises[0].sets).toHaveLength(1);
    // The last one stays: no "Treu la sèrie" any more.
    await user.press(setMenu(1));
    expect(actionSheet.mock.lastCall?.[0].options).not.toContain('Treu la sèrie');
  });

  test('adds a set, pre-filled with the last one', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(screen.getByRole('button', { name: 'Afegeix una sèrie a «Tracció al pit»' }));

    expect(screen.getByLabelText('kg · Tracció al pit, sèrie 3').props.placeholder).toBe('40');
  });

  test('skips an exercise with a reason, and Desfés brings it back', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    sheetChoices.push("Salta l'exercici", 'Màquina ocupada');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Rem assegut amb politja»' }));

    expect(screen.getByText('Saltat · Màquina ocupada')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Reps · Rem assegut amb politja, sèrie 1')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(screen.queryByText('Saltat · Màquina ocupada')).not.toBeOnTheScreen();
  });

  test('swaps an exercise for another from the library', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    sheetChoices.push("Canvia l'exercici");
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tracció al pit»' }));
    await user.press(await screen.findByRole('checkbox', { name: /Esquat/ }));
    await user.press(screen.getByRole('button', { name: 'Canvia' }));

    expect(screen.getByRole('header', { name: 'Esquat' })).toBeOnTheScreen();
    expect(screen.getByText('En lloc de «Tracció al pit»')).toBeOnTheScreen();
    expect(active()!.exercises[0]).toMatchObject({ exerciseId: 'squat', change: 'swapped' });
  });

  test('adds an exercise from the library, and takes it out again with Desfés', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(screen.getByRole('button', { name: '+ Afegeix exercicis' }));
    await user.press(await screen.findByRole('button', { name: /Esquat/ }));
    await user.press(screen.getByRole('button', { name: 'Afegeix (1)' }));

    expect(screen.getByRole('header', { name: 'Esquat' })).toBeOnTheScreen();
    expect(active()!.exercises.at(-1)).toMatchObject({ exerciseId: 'squat', change: 'added' });

    sheetChoices.push("Treu l'exercici");
    await user.press(screen.getByRole('button', { name: 'Opcions de «Esquat»' }));
    expect(screen.queryByRole('header', { name: 'Esquat' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(screen.getByRole('header', { name: 'Esquat' })).toBeOnTheScreen();
  });

  test('a note for today, which can also go into the routine', async () => {
    const user = userEvent.setup();
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    await user.press(screen.getByRole('button', { name: 'Afegeix una nota a «Tracció al pit»' }));
    await user.type(screen.getByLabelText("Nota d'avui per a «Tracció al pit»"), 'Agafada neutra');
    await user.press(screen.getByRole('button', { name: 'Desa-la també a la rutina' }));

    expect(saveNoteToRoutine).toHaveBeenCalledWith('re-1', 'Agafada neutra');
    expect(await screen.findByText('Nota desada a la rutina ✓')).toBeOnTheScreen();
    expect(active()!.exercises[0].notes).toBe('Agafada neutra');
  });

  test('a run: each block says what it is, with its pace, compared with its own last time', async () => {
    const user = userEvent.setup();
    const run = (distanceM: number, durationS: number) => ({ ...NO_TARGETS, distanceM, durationS });
    jest.mocked(fetchLastTime).mockResolvedValueOnce({
      run: { routine: [{ routineExerciseId: 're-warmup', sets: [run(1000, 340)] }], any: [] },
    });
    startWorkout(sundayRun);
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    expect(screen.getByRole('header', { name: 'Distància · 1 km' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Sèries · 2 × 400 m' })).toBeOnTheScreen();
    expect(screen.getByLabelText('metres · Sèries · 2 × 400 m, sèrie 1')).toBeOnTheScreen();
    // Last time's 5:40 for the warm-up.
    await waitFor(() => expect(screen.getByText('Ritme: 5:40 /km')).toBeOnTheScreen());

    await user.type(screen.getByLabelText('s · Distància · 1 km, sèrie 1'), '30');
    await user.type(screen.getByLabelText('min · Distància · 1 km, sèrie 1'), '5');
    expect(screen.getByText('Ritme: 5:30 /km')).toBeOnTheScreen();
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Distància · 1 km» feta' }));

    expect(screen.getByText('↑ −0:10 /km ✨')).toBeOnTheScreen();
    expect(screen.getByLabelText("Millor que l'últim cop: −0:10 /km")).toBeOnTheScreen();
    // No rest after the warm-up: straight into the intervals.
    expect(rest()).toBeNull();
  });

  test('a cardio machine: segments with the fields in use, the others on request', async () => {
    const user = userEvent.setup();
    startWorkout({
      ...upperBody,
      exercises: [
        {
          ...upperBody.exercises[0],
          exerciseId: 'stairs',
          exercise: cardioExercise('stairs', 'Escala'),
          sets: [
            { ...NO_TARGETS, durationS: 300, level: 8 },
            { ...NO_TARGETS, durationS: 300, level: 10 },
          ],
        },
      ],
    });
    await render(<ActiveWorkoutView onClose={jest.fn()} />, { wrapper: createAppWrapper() });

    expect(screen.getByText('Tram', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Nivell · Escala, tram 2').props.placeholder).toBe('10');
    expect(screen.queryByLabelText('% pendent · Escala, tram 1')).not.toBeOnTheScreen();

    sheetChoices.push('Mostra tots els camps');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Escala»' }));
    expect(screen.getByLabelText('% pendent · Escala, tram 1')).toBeOnTheScreen();

    // The first segment runs straight into the second.
    await user.press(screen.getByRole('checkbox', { name: 'Tram 1 de «Escala» fet' }));
    expect(rest()).toBeNull();
    expect(screen.getByRole('button', { name: 'Afegeix un tram a «Escala»' })).toBeOnTheScreen();
  });

  test('with no workout going, says so', async () => {
    useWorkoutStore.setState({ active: null });
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<ActiveWorkoutView onClose={onClose} />, { wrapper: createAppWrapper() });

    expect(screen.getByText('No hi ha cap entrenament en marxa.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tanca' }));
    expect(onClose).toHaveBeenCalled();
  });
});
