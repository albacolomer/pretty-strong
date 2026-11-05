import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchArchivedExercises, setExerciseArchived, setExerciseDeleted } from './api';
import { ArchivedExercises } from './ArchivedExercises';
import type { Exercise } from './exercise';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  fetchArchivedExercises: jest.fn(),
  setExerciseArchived: jest.fn(),
  setExerciseDeleted: jest.fn(() => Promise.resolve()),
}));
// No routines have it, so deleting doesn't ask first.
jest.mock('@/features/routines/useRoutines', () => ({ useRoutines: () => ({ data: [] }) }));
const mockFetchArchived = jest.mocked(fetchArchivedExercises);
const mockSetArchived = jest.mocked(setExerciseArchived);

const oldPress: Exercise = {
  id: 'custom-1',
  slug: null,
  names: null,
  name: 'Mi press',
  trackingType: 'weight_reps',
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  equipment: 'dumbbell',
  isUnilateral: false,
  videoUrl: null,
  photoPath: null,
};

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  mockFetchArchived.mockReset();
  mockSetArchived.mockReset();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ArchivedExercises />', () => {
  test('restores an archived exercise', async () => {
    const user = userEvent.setup();
    mockFetchArchived.mockResolvedValue([oldPress]);
    mockSetArchived.mockResolvedValue(oldPress);
    await render(<ArchivedExercises />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Recupera' }));

    expect(mockSetArchived).toHaveBeenCalledWith('custom-1', false);
    expect(await screen.findByText("S'ha recuperat «Mi press»")).toBeOnTheScreen();
    expect(screen.getByText('No tens cap exercici arxivat.')).toBeOnTheScreen();
  });

  test('explains when an active exercise already has that name', async () => {
    const user = userEvent.setup();
    mockFetchArchived.mockResolvedValue([oldPress]);
    mockSetArchived.mockRejectedValue({ code: '23505', message: 'duplicate key value' });
    await render(<ArchivedExercises />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Recupera' }));

    expect(
      await screen.findByText('Ja tens un exercici actiu amb aquest nom.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Mi press')).toBeOnTheScreen();
  });

  test('deletes an archived exercise from the list, with undo', async () => {
    const user = userEvent.setup();
    mockFetchArchived.mockResolvedValue([oldPress]);
    await render(<ArchivedExercises />, { wrapper: createAppWrapper() });

    // Once deleted, it's gone from the archived list too.
    mockFetchArchived.mockResolvedValue([]);
    await user.press(await screen.findByRole('button', { name: 'Esborra «Mi press»' }));

    // It was archived: undo leaves it archived.
    expect(setExerciseDeleted).toHaveBeenCalledWith('custom-1', true, true);
    expect(await screen.findByText('No tens cap exercici arxivat.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(setExerciseDeleted).toHaveBeenLastCalledWith('custom-1', false, true);
  });

  test('says so when nothing is archived', async () => {
    mockFetchArchived.mockResolvedValue([]);
    await render(<ArchivedExercises />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('No tens cap exercici arxivat.')).toBeOnTheScreen();
  });
});
