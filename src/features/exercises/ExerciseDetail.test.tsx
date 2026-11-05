import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { menus } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { useRoutines } from '@/features/routines/useRoutines';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchExerciseSettings, setExerciseArchived, setExerciseDeleted } from './api';
import type { Exercise } from './exercise';
import { ExerciseDetail } from './ExerciseDetail';
import { useExercises } from './useExercises';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  setExerciseArchived: jest.fn(),
  setExerciseDeleted: jest.fn(() => Promise.resolve()),
  fetchExerciseSettings: jest.fn(),
  saveExerciseSettings: jest.fn(),
}));
// Your active routines, to warn before deleting an exercise that's in one.
jest.mock('@/features/routines/useRoutines', () => ({ useRoutines: jest.fn() }));
// Fake only the library data; keep the real query keys.
jest.mock('./useExercises', () => ({
  ...jest.requireActual('./useExercises'),
  useExercises: jest.fn(),
}));

const hipThrust: Exercise = {
  id: 'hip_thrust',
  slug: 'hip_thrust',
  names: { ca: 'Hip thrust amb barra', es: 'Hip thrust con barra', en: 'Barbell hip thrust' },
  name: null,
  trackingType: 'weight_reps',
  primaryMuscles: ['glutes'],
  secondaryMuscles: ['hamstrings'],
  equipment: 'barbell',
  isUnilateral: false,
  videoUrl: null,
  photoPath: null,
  technique: null,
};
const custom: Exercise = {
  ...hipThrust,
  id: 'custom-1',
  slug: null,
  names: null,
  name: 'Hip thrust unilateral',
  isUnilateral: true,
  videoUrl: null,
  photoPath: null,
  technique: null,
};

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest
    .mocked(useExercises)
    .mockReturnValue({ data: [hipThrust, custom], isPending: false } as ReturnType<
      typeof useExercises
    >);
  jest.mocked(setExerciseArchived).mockReset().mockResolvedValue(custom);
  jest.mocked(fetchExerciseSettings).mockResolvedValue({});
  jest.mocked(setExerciseDeleted).mockClear();
  jest.mocked(useRoutines).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useRoutines>);
});

// The routines that have the custom exercise in them.
function routinesWithCustom(...names: string[]) {
  const routines: Routine[] = names.map((name, index) => ({
    ...upperBody,
    id: `routine-${index}`,
    name,
    exercises: [{ ...upperBody.exercises[0], exerciseId: 'custom-1', exercise: custom }],
  }));
  jest
    .mocked(useRoutines)
    .mockReturnValue({ data: routines } as unknown as ReturnType<typeof useRoutines>);
}

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExerciseDetail />', () => {
  test('shows what a built-in exercise is and trains, without an archive button', async () => {
    await render(<ExerciseDetail exerciseId="hip_thrust" onEdit={jest.fn()} onRemoved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    // Your notes and rest load just after; wait like a user would.
    await screen.findByText('Descans per defecte');

    expect(screen.getByRole('header', { name: 'Hip thrust amb barra' })).toBeOnTheScreen();
    expect(screen.getByText('Pes i repeticions · kg · reps')).toBeOnTheScreen();
    expect(screen.getByText('Barra')).toBeOnTheScreen();
    expect(screen.getByText('Glutis')).toBeOnTheScreen();
    expect(screen.getByText('Isquiotibials')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: "Arxiva l'exercici" })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: "Edita l'exercici" })).not.toBeOnTheScreen();
  });

  test('archives your own exercise, goes back and offers undo', async () => {
    const user = userEvent.setup();
    const onRemoved = jest.fn();
    await render(<ExerciseDetail exerciseId="custom-1" onEdit={jest.fn()} onRemoved={onRemoved} />, {
      wrapper: createAppWrapper(),
    });
    await screen.findByText('Descans per defecte');

    expect(screen.getByText('10 repeticions vol dir 10 per costat.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: "Arxiva l'exercici" }));

    expect(onRemoved).toHaveBeenCalled();
    expect(setExerciseArchived).toHaveBeenCalledWith('custom-1', true);
    expect(screen.getByText("S'ha arxivat «Hip thrust unilateral»")).toBeOnTheScreen();
  });

  test('deletes your own exercise, goes back and offers undo', async () => {
    const user = userEvent.setup();
    const onRemoved = jest.fn();
    await render(<ExerciseDetail exerciseId="custom-1" onEdit={jest.fn()} onRemoved={onRemoved} />, {
      wrapper: createAppWrapper(),
    });
    await screen.findByText('Descans per defecte');

    await user.press(screen.getByRole('button', { name: "Esborra l'exercici" }));

    expect(onRemoved).toHaveBeenCalled();
    expect(setExerciseDeleted).toHaveBeenCalledWith('custom-1', true, false);
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(setExerciseDeleted).toHaveBeenLastCalledWith('custom-1', false, false);
  });

  test('deleting an exercise that is in routines says which first', async () => {
    const user = userEvent.setup();
    const onRemoved = jest.fn();
    routinesWithCustom('Tren inferior 1', 'Glutis');
    const choices = ['Cancel·la', "Esborra'l igualment"];
    const actionSheet = jest
      .spyOn(menus, 'show')
      .mockImplementation((options, callback) =>
        callback(options.options.indexOf(choices.shift() ?? '')),
      );
    await render(<ExerciseDetail exerciseId="custom-1" onEdit={jest.fn()} onRemoved={onRemoved} />, {
      wrapper: createAppWrapper(),
    });
    await screen.findByText('Descans per defecte');

    // Cancel·la: nothing happens.
    await user.press(screen.getByRole('button', { name: "Esborra l'exercici" }));
    expect(actionSheet.mock.lastCall?.[0].title).toBe(
      "«Hip thrust unilateral» és a 2 rutines: Tren inferior 1, Glutis. Si l'esborres, en sortirà.",
    );
    expect(setExerciseDeleted).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: "Esborra l'exercici" }));
    expect(setExerciseDeleted).toHaveBeenCalledWith('custom-1', true, false);
    expect(onRemoved).toHaveBeenCalled();
    actionSheet.mockRestore();
  });

  test('opens the edit screen for your own exercise', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    await render(<ExerciseDetail exerciseId="custom-1" onEdit={onEdit} onRemoved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    await screen.findByText('Descans per defecte');

    await user.press(screen.getByRole('button', { name: "Edita l'exercici" }));

    expect(onEdit).toHaveBeenCalled();
  });

  test('shows the technique tips in your language', async () => {
    jest.mocked(useExercises).mockReturnValue({
      data: [
        {
          ...hipThrust,
          technique: { ca: ['Mentó avall'], es: ['Barbilla abajo'], en: ['Chin down'] },
        },
      ],
      isPending: false,
    } as ReturnType<typeof useExercises>);
    await render(<ExerciseDetail exerciseId="hip_thrust" onEdit={jest.fn()} onRemoved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(screen.getByText('Tècnica')).toBeOnTheScreen();
    expect(screen.getByText('Mentó avall')).toBeOnTheScreen();
    await screen.findByText('Descans per defecte');
  });

  test('says so when the exercise is not in the library', async () => {
    await render(<ExerciseDetail exerciseId="missing" onEdit={jest.fn()} onRemoved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(screen.getByText("No s'ha trobat aquest exercici.")).toBeOnTheScreen();
  });
});
