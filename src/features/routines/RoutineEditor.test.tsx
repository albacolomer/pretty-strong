import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { usePreventRemove } from 'expo-router/react-navigation';
import { ActionSheetIOS } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchExercises, fetchExerciseSettings } from '@/features/exercises/api';
import { createQueryWrapper } from '@/test-utils/queryWrapper';
import { drop } from '@/test-utils/sortablesMock';

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
jest.mock('react-native-sortables', () => jest.requireActual('@/test-utils/sortablesMock'));
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
    await user.press(screen.getByRole('radio', { name: 'Híbrid' }));
    expect(screen.getByText('HYROX i sessions que canvien cada setmana.')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Notes (opcional)'), 'Simulació curta');
    expect(guardsUnsavedChanges()).toBe(true);

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith({
      id: null,
      name: 'HYROX dimarts',
      label: 'hybrid',
      customLabel: null,
      plannedDurationS: null,
      notes: 'Simulació curta',
      weekdays: [],
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

  test('adds exercises from the picker, then adjusts, reorders and removes them', async () => {
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

    // Drag the squat to the top, then remove the Romanian deadlift.
    await user.press(screen.getByRole('button', { name: 'Reordena' }));
    await drop(1, 0);
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    choice = 'Treu de la rutina';
    await user.press(screen.getByRole('button', { name: 'Opcions de «Pes mort romanès»' }));

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cames',
        exercises: [
          expect.objectContaining({
            exercise_id: 'squat',
            planned_sets: 3,
            rest_s: null,
            group_key: null,
            notes: null,
            target_weight_kg: null,
          }),
        ],
      }),
    );
    actionSheet.mockRestore();
  });

  test('adds and edits this routine’s note on each exercise', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchRoutines).mockResolvedValue([
      {
        ...upperBody,
        exercises: upperBody.exercises.map((item) =>
          item.id === 're-2' ? { ...item, notes: 'Agafada ampla' } : item,
        ),
      },
    ]);
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    // A saved note shows straight away; the others offer to add one.
    expect(await screen.findByDisplayValue('Agafada ampla')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Afegeix una nota' })).toHaveLength(3);
    expect(guardsUnsavedChanges()).toBe(false);

    await user.press(screen.getAllByRole('button', { name: 'Afegeix una nota' })[0]);
    await user.type(screen.getByLabelText('Nota en aquesta rutina per a «Tracció al pit»'), 'Agafada neutra');
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        exercises: [
          expect.objectContaining({ id: 're-1', notes: 'Agafada neutra' }),
          expect.objectContaining({ id: 're-2', notes: 'Agafada ampla' }),
          expect.objectContaining({ id: 're-3', notes: null }),
          expect.objectContaining({ id: 're-4', notes: null }),
        ],
      }),
    );
  });

  test('reorders by dragging; Cancel·la keeps the order', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });
    const reorder = await screen.findByRole('button', { name: 'Reordena' });

    await user.press(reorder);
    expect(screen.getByLabelText('Mou «Curl martell»')).toBeOnTheScreen();
    await drop(3, 0);
    await user.press(screen.getByRole('button', { name: 'Cancel·la' }));
    expect(guardsUnsavedChanges()).toBe(false);

    await user.press(reorder);
    await drop(3, 0);
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(guardsUnsavedChanges()).toBe(true);
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    const saved = mockSaveRoutine.mock.lastCall?.[0];
    expect(saved?.exercises.map((item) => item.id)).toEqual(['re-4', 're-1', 're-2', 're-3']);
  });

  test('makes a superset from the menu, then a circuit by dragging a third exercise in', async () => {
    const user = userEvent.setup();
    // Each action sheet picks the next label in the list.
    const choices: string[] = [];
    const actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((options, callback) =>
        callback(options.options.indexOf(choices.shift() ?? '')),
      );
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    choices.push('Fes un superset amb…', 'Curl martell');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Face pull»' }));

    // One box for the pair, with the rounds and rest they share.
    expect(screen.getByRole('header', { name: 'Superset' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Una ronda més' }));
    expect(screen.getByLabelText('4 rondes')).toBeOnTheScreen();

    // Drag "Tracció al pit" (first) between Face pull and Curl martell.
    await user.press(screen.getByRole('button', { name: 'Reordena' }));
    await drop(0, 2);
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(screen.getByRole('header', { name: 'Circuit' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));
    const saved = mockSaveRoutine.mock.lastCall?.[0];
    expect(
      saved?.exercises.map(({ id, group_key, planned_sets }) => [id, group_key, planned_sets]),
    ).toEqual([
      ['re-2', null, 3],
      ['re-3', 'g1', 4],
      ['re-1', 'g1', 4],
      ['re-4', 'g1', 4],
    ]);

    // And out again: a circuit of three becomes a superset of two.
    choices.push('Treu del circuit');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tracció al pit»' }));
    expect(screen.getByRole('header', { name: 'Superset' })).toBeOnTheScreen();
    actionSheet.mockRestore();
  });

  test('says so when the routine does not exist', async () => {
    await render(<RoutineEditor routineId="missing" onSaved={jest.fn()} />, {
      wrapper: createQueryWrapper(),
    });

    expect(await screen.findByText("No s'ha trobat aquesta rutina.")).toBeOnTheScreen();
  });
});
