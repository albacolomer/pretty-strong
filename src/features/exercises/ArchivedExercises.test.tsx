import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchArchivedExercises, setExerciseArchived } from './api';
import { ArchivedExercises } from './ArchivedExercises';
import type { Exercise } from './exercise';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchArchivedExercises: jest.fn(), setExerciseArchived: jest.fn() }));
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

  test('says so when nothing is archived', async () => {
    mockFetchArchived.mockResolvedValue([]);
    await render(<ArchivedExercises />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('No tens cap exercici arxivat.')).toBeOnTheScreen();
  });
});
