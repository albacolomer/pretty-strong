import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchExerciseSettings, setExerciseArchived } from './api';
import type { Exercise } from './exercise';
import { ExerciseDetail } from './ExerciseDetail';
import { useExercises } from './useExercises';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  setExerciseArchived: jest.fn(),
  fetchExerciseSettings: jest.fn(),
  saveExerciseSettings: jest.fn(),
}));
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
};
const custom: Exercise = {
  ...hipThrust,
  id: 'custom-1',
  slug: null,
  names: null,
  name: 'Hip thrust unilateral',
  isUnilateral: true,
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
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExerciseDetail />', () => {
  test('shows what a built-in exercise is and trains, without an archive button', async () => {
    await render(<ExerciseDetail exerciseId="hip_thrust" onArchived={jest.fn()} />, {
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
  });

  test('archives your own exercise, goes back and offers undo', async () => {
    const user = userEvent.setup();
    const onArchived = jest.fn();
    await render(<ExerciseDetail exerciseId="custom-1" onArchived={onArchived} />, {
      wrapper: createAppWrapper(),
    });
    await screen.findByText('Descans per defecte');

    expect(screen.getByText('10 repeticions vol dir 10 per costat.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: "Arxiva l'exercici" }));

    expect(onArchived).toHaveBeenCalled();
    expect(setExerciseArchived).toHaveBeenCalledWith('custom-1', true);
    expect(screen.getByText("S'ha arxivat «Hip thrust unilateral»")).toBeOnTheScreen();
  });

  test('says so when the exercise is not in the library', async () => {
    await render(<ExerciseDetail exerciseId="missing" onArchived={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(screen.getByText("No s'ha trobat aquest exercici.")).toBeOnTheScreen();
  });
});
