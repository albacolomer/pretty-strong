import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { ActionSheetIOS } from 'react-native';

import { NO_TARGETS, type Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { workoutFromRoutine } from './activeWorkout';
import { ActiveWorkoutView } from './ActiveWorkoutView';
import { useWorkoutStore } from './workoutStore';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

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
function startWorkout() {
  useWorkoutStore.setState({
    active: workoutFromRoutine(routine, {
      date: '2026-10-20',
      plannedRoutineId: 'routine-1',
      changeReason: null,
      startedAt: new Date().toISOString(),
      newId: () => `id-${(ids += 1)}`,
    }),
    pending: [],
  });
}

// Each native action sheet picks the next of these labels.
const sheetChoices: string[] = [];
let actionSheet: jest.SpyInstance;

beforeEach(() => {
  startWorkout();
  jest.mocked(Haptics.impactAsync).mockClear();
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

const active = () => useWorkoutStore.getState().active;

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ActiveWorkoutView />', () => {
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

  test('finishing with sets left asks first, then keeps the workout to be saved', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<ActiveWorkoutView onClose={onClose} />, { wrapper: createAppWrapper() });
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    const workoutId = active()!.id;

    sheetChoices.push("Acaba l'entrenament");
    await user.press(screen.getByRole('button', { name: "Acaba l'entrenament" }));

    expect(actionSheet.mock.lastCall?.[0].message).toBe('2 sèries sense ✓ no es desaran.');
    expect(onClose).toHaveBeenCalled();
    const { active: after, pending } = useWorkoutStore.getState();
    expect(after).toBeNull();
    expect(pending.map((workout) => workout.id)).toEqual([workoutId]);
    expect(pending[0].endedAt).toEqual(expect.any(String));
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
