import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchArchivedRoutines, fetchRoutines, setRoutineArchived, setRoutineDeleted } from './api';
import { ArchivedRoutines } from './ArchivedRoutines';
import { upperBody } from './testData';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  fetchRoutines: jest.fn(),
  fetchArchivedRoutines: jest.fn(),
  setRoutineArchived: jest.fn(),
  setRoutineDeleted: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(fetchRoutines).mockResolvedValue([]);
  jest.mocked(setRoutineArchived).mockReset().mockResolvedValue();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ArchivedRoutines />', () => {
  test('restores an archived routine', async () => {
    const user = userEvent.setup();
    const swim = { ...upperBody, id: 'routine-2', name: 'Piscina', label: 'custom' as const, customLabel: 'Natació' };
    jest.mocked(fetchArchivedRoutines).mockResolvedValue([swim]);
    await render(<ArchivedRoutines />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Piscina')).toBeOnTheScreen();
    expect(screen.getByText('Natació')).toBeOnTheScreen();

    // Once restored, it's no longer archived.
    jest.mocked(fetchArchivedRoutines).mockResolvedValue([]);
    await user.press(screen.getByRole('button', { name: 'Recupera' }));

    expect(setRoutineArchived).toHaveBeenCalledWith('routine-2', false);
    expect(await screen.findByText("S'ha recuperat «Piscina»")).toBeOnTheScreen();
    expect(await screen.findByText('No tens cap rutina arxivada.')).toBeOnTheScreen();
  });

  test('deletes an archived routine, with undo', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchArchivedRoutines).mockResolvedValue([upperBody]);
    await render(<ArchivedRoutines />, { wrapper: createAppWrapper() });

    jest.mocked(fetchArchivedRoutines).mockResolvedValue([]);
    await user.press(await screen.findByRole('button', { name: 'Esborra «Tren superior 1»' }));

    // It was archived: undo leaves it archived.
    expect(setRoutineDeleted).toHaveBeenCalledWith('routine-1', true, true);
    expect(await screen.findByText('No tens cap rutina arxivada.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(setRoutineDeleted).toHaveBeenLastCalledWith('routine-1', false, true);
  });
});
