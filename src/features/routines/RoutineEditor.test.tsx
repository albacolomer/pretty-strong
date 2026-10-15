import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { usePreventRemove } from 'expo-router/react-navigation';

import { useAuth } from '@/features/auth/AuthProvider';
import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { fetchRoutines, saveRoutine } from './api';
import { RoutineEditor } from './RoutineEditor';
import { upperBody } from './testData';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchRoutines: jest.fn(), saveRoutine: jest.fn() }));
jest.mock('expo-router', () => ({ useNavigation: () => ({ dispatch: jest.fn() }) }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
const mockSaveRoutine = jest.mocked(saveRoutine);
const mockPreventRemove = jest.mocked(usePreventRemove);

// Whether the screen currently refuses to close without asking.
const guardsUnsavedChanges = () => mockPreventRemove.mock.lastCall?.[0];

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(fetchRoutines).mockResolvedValue([upperBody]);
  mockSaveRoutine.mockReset().mockResolvedValue('routine-1');
  mockPreventRemove.mockClear();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<RoutineEditor />', () => {
  test('a new routine needs a name', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId={null} onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(screen.getByText('Aquest camp és obligatori.')).toBeOnTheScreen();
    expect(mockSaveRoutine).not.toHaveBeenCalled();
  });

  test('creates a routine with its name, type and notes', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    await render(<RoutineEditor routineId={null} onSaved={onSaved} />, {
      wrapper: createQueryWrapper(),
    });

    expect(guardsUnsavedChanges()).toBe(false);
    await user.type(screen.getByLabelText('Nom'), 'HYROX dimarts');
    await user.press(screen.getByRole('radio', { name: 'HYROX' }));
    await user.type(screen.getByLabelText('Notes (opcional)'), 'Simulació curta');
    expect(guardsUnsavedChanges()).toBe(true);

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith({
      id: null,
      name: 'HYROX dimarts',
      label: 'hyrox',
      notes: 'Simulació curta',
      exercises: [],
    });
    expect(onSaved).toHaveBeenCalled();
  });

  test('edits a saved routine, keeping its exercises and their ids', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    const name = await screen.findByLabelText('Nom');
    expect(name).toHaveDisplayValue('Tren superior 1');
    expect(screen.getByRole('radio', { name: 'Força' })).toBeChecked();

    await user.clear(name);
    await user.type(name, 'Tren superior A');
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'routine-1',
        name: 'Tren superior A',
        exercises: expect.arrayContaining([expect.objectContaining({ id: 're-1' })]),
      }),
    );
  });

  test('says so when the routine does not exist', async () => {
    await render(<RoutineEditor routineId="missing" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    expect(await screen.findByText("No s'ha trobat aquesta rutina.")).toBeOnTheScreen();
  });
});
