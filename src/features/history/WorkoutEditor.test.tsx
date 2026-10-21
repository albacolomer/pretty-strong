import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import { fetchRoutines } from '@/features/routines/api';
import { NO_TARGETS, type Routine } from '@/features/routines/routine';
import { testExercise, upperBody } from '@/features/routines/testData';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchPastWorkout, saveWorkout } from './api';
import { EditPastWorkout } from './EditPastWorkout';
import { LogPastWorkout } from './LogPastWorkout';
import type { PastWorkout } from './pastWorkout';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({
  fetchHistory: jest.fn(),
  fetchPastWorkout: jest.fn(),
  saveWorkout: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('@/features/exercises/api', () => ({
  fetchExercises: jest.fn(() => Promise.resolve([])),
  fetchExerciseSettings: jest.fn(() => Promise.resolve({})),
}));
jest.mock('@/features/workout/api', () => ({
  fetchLastTime: jest.fn(() => Promise.resolve({})),
  saveNoteToRoutine: jest.fn(),
  deleteSession: jest.fn(),
}));
jest.mock('expo-crypto', () => {
  let ids = 0;
  return { randomUUID: () => `new-${(ids += 1)}` };
});
// Today is Wednesday 21 October 2026.
jest.mock('@/features/schedule/useToday', () => ({ useToday: () => new Date(2026, 9, 21) }));

const lift = (weightKg: number, reps: number) => ({ ...NO_TARGETS, weightKg, reps });

const past: PastWorkout = {
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
  energy: null,
  notes: null,
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
        { id: 'set-1', setType: 'normal', numbers: lift(40, 10), rpe: null, completedAt: '2026-10-20T17:10:00.000Z' },
      ],
    },
  ],
};

beforeEach(() => jest.mocked(saveWorkout).mockClear());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('editing a past workout (US-23)', () => {
  test('shows it as saved; changes are kept on "Desa"', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    jest.mocked(fetchPastWorkout).mockResolvedValue(past);
    await render(<EditPastWorkout id="session-1" onClose={onClose} />, {
      wrapper: createAppWrapper(),
    });

    expect(await screen.findByRole('header', { name: 'Dimarts, 20 d’octubre' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Durada (min)').props.value).toBe('60');
    const kg = screen.getByLabelText('kg · Tracció al pit, sèrie 1');
    expect(kg.props.value).toBe('40');
    expect(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' })).toBeChecked();
    // Nothing goes after "Dia següent": today is the 21st.
    await user.press(screen.getByRole('button', { name: 'Dia anterior' }));
    expect(screen.getByRole('header', { name: 'Dilluns, 19 d’octubre' })).toBeOnTheScreen();

    await user.clear(kg);
    await user.type(kg, '42,5');
    await user.press(screen.getByRole('radio', { name: '4 de 5' }));
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const saved = jest.mocked(saveWorkout).mock.lastCall?.[0];
    expect(saved).toMatchObject({ id: 'session-1', date: '2026-10-19', energy: 4, logMode: 'live' });
    expect(saved?.exercises[0].sets[0].numbers).toMatchObject({ weightKg: 42.5, reps: 10 });
  });

  test('"Cancel·la" leaves it as it was', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    jest.mocked(fetchPastWorkout).mockResolvedValue(past);
    await render(<EditPastWorkout id="session-1" onClose={onClose} />, {
      wrapper: createAppWrapper(),
    });

    await user.press(await screen.findByRole('button', { name: 'Cancel·la' }));
    expect(onClose).toHaveBeenCalled();
    expect(saveWorkout).not.toHaveBeenCalled();
  });
});

describe('logging a workout afterwards (US-24)', () => {
  // Tracció al pit planned as 1 × 10 at 40 kg; Rem assegut, 1 set.
  const routine: Routine = {
    ...upperBody,
    plannedDurationS: 3600,
    exercises: [
      { ...upperBody.exercises[0], sets: [lift(40, 10)] },
      { ...upperBody.exercises[1], sets: [NO_TARGETS] },
    ],
  };

  test('starts from the routine; what is ticked is saved, as a quick log', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    jest.mocked(fetchRoutines).mockResolvedValue([routine]);
    await render(<LogPastWorkout date="2026-10-15" routineId="routine-1" onClose={onClose} />, {
      wrapper: createAppWrapper(),
    });

    expect(await screen.findByRole('header', { name: 'Dijous, 15 d’octubre' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Durada (min)').props.value).toBe('60');
    expect(screen.getByLabelText('kg · Tracció al pit, sèrie 1').props.placeholder).toBe('40');
    await user.press(screen.getByRole('checkbox', { name: 'Sèrie 1 de «Tracció al pit» feta' }));
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const saved = jest.mocked(saveWorkout).mock.lastCall?.[0];
    expect(saved).toMatchObject({
      date: '2026-10-15',
      routineId: 'routine-1',
      logMode: 'quick',
      durationS: 3600,
      startedAt: null,
    });
    // Rem assegut wasn't ticked, so it isn't saved.
    expect(saved?.exercises.map((exercise) => exercise.exerciseId)).toEqual(['exercise-1']);
    expect(saved?.exercises[0].sets[0].numbers).toMatchObject({ weightKg: 40, reps: 10 });
  });

  test('without a routine it starts empty, to add exercises to', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([routine]);
    await render(<LogPastWorkout date="2026-10-15" routineId={null} onClose={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(await screen.findByText('No hi ha exercicis registrats.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '+ Afegeix exercicis' })).toBeOnTheScreen();
  });
});
