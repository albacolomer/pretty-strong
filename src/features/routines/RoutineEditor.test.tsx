import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { usePreventRemove } from 'expo-router/react-navigation';
import { ActionSheetIOS } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchExercises, fetchExerciseSettings } from '@/features/exercises/api';
import { createQueryWrapper } from '@/test-utils/queryWrapper';

import { fetchRoutines, saveRoutine } from './api';
import { RoutineEditor } from './RoutineEditor';
import { testExercise, upperBody } from './testData';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({ fetchRoutines: jest.fn(), saveRoutine: jest.fn() }));
jest.mock('@/features/exercises/api', () => ({
  fetchExercises: jest.fn(),
  fetchExerciseSettings: jest.fn(),
}));
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
  jest
    .mocked(fetchExercises)
    .mockResolvedValue([testExercise('squat', 'Esquat amb barra'), testExercise('rdl', 'Pes mort romanès')]);
  // Your own default rest for the squat; the app default (1:30) for others.
  jest.mocked(fetchExerciseSettings).mockResolvedValue({ squat: { notes: null, defaultRestS: 150 } });
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

  test('adds exercises from the picker, then adjusts, moves and removes them', async () => {
    const user = userEvent.setup();
    // Pretend the user picks this label in the native action sheet.
    let choice = '';
    const actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((options, callback) =>
      callback(options.options.indexOf(choice)),
    );
    await render(<RoutineEditor routineId={null} onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });
    await user.type(screen.getByLabelText('Nom'), 'Cames');

    await user.press(screen.getByRole('button', { name: 'Afegeix exercicis' }));
    await user.press(await screen.findByRole('checkbox', { name: /Pes mort romanès/ }));
    await user.press(screen.getByRole('checkbox', { name: /Esquat amb barra/ }));
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));

    // Rest shows each exercise's own default, greyed out.
    expect(screen.getAllByLabelText('Descans: 1:30')).toHaveLength(1);
    expect(screen.getByLabelText('Descans: 2:30')).toBeOnTheScreen();

    // First card (Pes mort romanès): 4 sets and 15 s more rest.
    await user.press(screen.getAllByRole('button', { name: 'Afegeix una sèrie' })[0]);
    await user.press(screen.getAllByRole('button', { name: 'Afegeix 15 segons' })[0]);
    expect(screen.getByLabelText('4 sèries')).toBeOnTheScreen();

    // Move the squat up, then remove the Romanian deadlift.
    choice = 'Mou amunt';
    await user.press(screen.getByRole('button', { name: 'Opcions de «Esquat amb barra»' }));
    choice = 'Treu de la rutina';
    await user.press(screen.getByRole('button', { name: 'Opcions de «Pes mort romanès»' }));

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cames',
        exercises: [
          { exercise_id: 'squat', planned_sets: 3, rest_s: null, group_key: null, notes: null },
        ],
      }),
    );
    actionSheet.mockRestore();
  });

  test('says so when the routine does not exist', async () => {
    await render(<RoutineEditor routineId="missing" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    expect(await screen.findByText("No s'ha trobat aquesta rutina.")).toBeOnTheScreen();
  });
});
