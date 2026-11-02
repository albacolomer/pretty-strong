import '@/lib/i18n';

import { act, render, screen, userEvent } from '@testing-library/react-native';
import { usePreventRemove } from 'expo-router/react-navigation';

import { menus } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchExercises, fetchExerciseSettings } from '@/features/exercises/api';
import { createAppWrapper } from '@/test-utils/appWrapper';
import { drop } from '@/test-utils/sortablesMock';

import { fetchRoutines, saveRoutine, setRoutineArchived } from './api';
import { NO_TARGETS } from './routine';
import { RoutineEditor } from './RoutineEditor';
import { testExercise, upperBody } from './testData';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({
  fetchRoutines: jest.fn(),
  saveRoutine: jest.fn(),
  fetchArchivedRoutines: jest.fn(),
  setRoutineArchived: jest.fn(),
}));
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

// Each native action sheet (⋯ menus, the type list…) picks the next of these
// labels, or is cancelled when there's none.
const sheetChoices: string[] = [];
let actionSheet: jest.SpyInstance;

type User = ReturnType<typeof userEvent.setup>;

// Opens an item's ⋯ menu and picks `choices`, in order.
async function fromMenu(user: User, name: string, ...choices: string[]) {
  sheetChoices.push(...choices);
  await user.press(await screen.findByRole('button', { name: `Opcions de «${name}»` }));
}

// Picks a type from the list the "Força ▾" button opens.
async function chooseType(user: User, current: string, type: string) {
  sheetChoices.push(type);
  await user.press(await screen.findByRole('button', { name: `Tipus: ${current}` }));
}

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
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(menus, 'show')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<RoutineEditor />', () => {
  test('a new routine needs a name', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId={null} onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(screen.getByText('Aquest camp és obligatori.')).toBeOnTheScreen();
    expect(mockSaveRoutine).not.toHaveBeenCalled();
  });

  test('creates a routine with its name, type and note', async () => {
    const user = userEvent.setup();
    const onSaved = jest.fn();
    await render(<RoutineEditor routineId={null} onSaved={onSaved} />, {
      wrapper: createAppWrapper(),
    });

    expect(guardsUnsavedChanges()).toBe(false);
    await user.type(screen.getByLabelText('Nom'), 'HYROX dimarts');
    await chooseType(user, 'Força', 'Híbrid');
    expect(screen.getByRole('button', { name: 'Tipus: Híbrid' })).toBeOnTheScreen();
    // The routine's note is a button until it's needed.
    await user.press(screen.getByRole('button', { name: 'Afegeix una nota' }));
    await user.type(screen.getByLabelText('Nota de la rutina'), 'Simulació curta');
    expect(guardsUnsavedChanges()).toBe(true);

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith({
      id: null,
      name: 'HYROX dimarts',
      label: 'hybrid',
      customLabel: null,
      // A hybrid session starts at 1 hour.
      plannedDurationS: 3600,
      notes: 'Simulació curta',
      description: null,
      weekdays: [],
      exercises: [],
    });
    expect(onSaved).toHaveBeenCalled();
  });

  test('edits a saved routine, keeping its exercises and their ids', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    const name = await screen.findByLabelText('Nom');
    expect(name).toHaveDisplayValue('Tren superior 1');
    expect(screen.getByRole('button', { name: 'Tipus: Força' })).toBeOnTheScreen();

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
    await render(<RoutineEditor routineId={null} onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    await user.type(screen.getByLabelText('Nom'), 'Cames');

    await user.press(screen.getByRole('button', { name: 'Afegeix exercicis' }));
    await user.press(await screen.findByRole('checkbox', { name: /Pes mort romanès/ }));
    await user.press(screen.getByRole('checkbox', { name: /Esquat amb barra/ }));
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));

    // Rest shows each exercise's own default, greyed out.
    expect(screen.getAllByLabelText('Descans: 1:30')).toHaveLength(1);
    expect(screen.getByLabelText('Descans: 2:30')).toBeOnTheScreen();

    // Each starts with one set. First card (Pes mort romanès): a second
    // set and 15 s more rest.
    expect(screen.queryByLabelText('Reps · Pes mort romanès, sèrie 2')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Afegeix una sèrie a «Pes mort romanès»' }));
    await user.press(screen.getAllByRole('button', { name: 'Afegeix 15 segons' })[0]);
    expect(screen.getByLabelText('Reps · Pes mort romanès, sèrie 2')).toBeOnTheScreen();
    expect(screen.getByLabelText('Descans: 1:45')).toBeOnTheScreen();

    // Drag the squat to the top, then remove the Romanian deadlift.
    await fromMenu(user, 'Pes mort romanès', 'Reordena');
    await drop(1, 0);
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    await fromMenu(user, 'Pes mort romanès', 'Treu de la rutina');

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cames',
        exercises: [
          expect.objectContaining({
            exercise_id: 'squat',
            rest_s: null,
            group_key: null,
            notes: null,
            sets: [expect.objectContaining({ target_reps: null, target_weight_kg: null })],
          }),
        ],
      }),
    );
  });

  test('types a rest, like a microwave, or goes back to the exercise’s own', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    const rests = await screen.findAllByLabelText('Descans: 1:30');

    await user.type(rests[0], '245');
    expect(screen.getByLabelText('Descans: 2:45')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));
    expect(mockSaveRoutine.mock.lastCall?.[0].exercises[0]).toMatchObject({ rest_s: 165 });

    // The menu offers the exercise's own rest once the routine sets one.
    await fromMenu(user, 'Tracció al pit', "Usa el descans de l'exercici");
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));
    expect(mockSaveRoutine.mock.lastCall?.[0].exercises[0]).toMatchObject({ rest_s: null });
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
      wrapper: createAppWrapper(),
    });

    // A saved note shows straight away; the others offer "+ Nota".
    expect(await screen.findByDisplayValue('Agafada ampla')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^Afegeix una nota a «/ })).toHaveLength(3);
    expect(guardsUnsavedChanges()).toBe(false);

    await user.press(screen.getByRole('button', { name: 'Afegeix una nota a «Tracció al pit»' }));
    await user.type(
      screen.getByLabelText('Nota en aquesta rutina per a «Tracció al pit»'),
      'Agafada neutra',
    );
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
      wrapper: createAppWrapper(),
    });

    await fromMenu(user, 'Tracció al pit', 'Reordena');
    expect(screen.getByLabelText('Mou «Curl martell»')).toBeOnTheScreen();
    await drop(3, 0);
    await user.press(screen.getByRole('button', { name: 'Cancel·la' }));
    expect(guardsUnsavedChanges()).toBe(false);

    await fromMenu(user, 'Tracció al pit', 'Reordena');
    await drop(3, 0);
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(guardsUnsavedChanges()).toBe(true);
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    const saved = mockSaveRoutine.mock.lastCall?.[0];
    expect(saved?.exercises.map((item) => item.id)).toEqual(['re-4', 're-1', 're-2', 're-3']);
  });

  test('a single exercise has nothing to reorder', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([
      { ...upperBody, exercises: upperBody.exercises.slice(0, 1) },
    ]);
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    await fromMenu(user, 'Tracció al pit');

    expect(actionSheet.mock.lastCall?.[0].options).not.toContain('Reordena');
  });

  test('makes a superset from the menu, then a circuit by dragging a third exercise in', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    await fromMenu(user, 'Face pull', 'Fes un superset amb…', 'Curl martell');

    // One box for the pair, with their rounds and the rest they share. A set
    // added to one is a round for both.
    expect(screen.getByRole('header', { name: 'Superset' })).toBeOnTheScreen();
    expect(screen.getByText('3 rondes')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Afegeix una sèrie a «Face pull»' }));
    expect(screen.getByText('4 rondes')).toBeOnTheScreen();
    expect(screen.getByLabelText('Reps · Curl martell, sèrie 4')).toBeOnTheScreen();

    // Drag "Tracció al pit" (first) between Face pull and Curl martell.
    await fromMenu(user, 'Face pull', 'Reordena');
    await drop(0, 2);
    await user.press(screen.getByRole('button', { name: 'Fet' }));
    expect(screen.getByRole('header', { name: 'Circuit' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));
    const saved = mockSaveRoutine.mock.lastCall?.[0];
    expect(
      saved?.exercises.map(({ id, group_key, sets }) => [id, group_key, sets.length]),
    ).toEqual([
      ['re-2', null, 3],
      ['re-3', 'g1', 4],
      ['re-1', 'g1', 4],
      ['re-4', 'g1', 4],
    ]);

    // And out again: a circuit of three becomes a superset of two.
    await fromMenu(user, 'Tracció al pit', 'Treu del circuit');
    expect(screen.getByRole('header', { name: 'Superset' })).toBeOnTheScreen();
  });

  test('a custom type has its own name and a duration you can change or take off', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId={null} onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    await user.type(screen.getByLabelText('Nom'), 'Piscina');

    expect(screen.queryByLabelText('Nom del tipus')).not.toBeOnTheScreen();
    expect(screen.queryByText('Durada prevista')).not.toBeOnTheScreen();

    await chooseType(user, 'Força', 'Personalitzat');
    await user.type(screen.getByLabelText('Nom del tipus'), 'Natació');
    expect(screen.getByLabelText('Durada prevista: 1 h')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: '5 minuts menys' }));
    expect(screen.getByLabelText('Durada prevista: 55 min')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenLastCalledWith(
      expect.objectContaining({ label: 'custom', customLabel: 'Natació', plannedDurationS: 3300 }),
    );

    // Taken off, then saved without a duration.
    await user.press(screen.getByRole('button', { name: 'Sense durada' }));
    expect(screen.getByRole('button', { name: 'Afegeix una durada' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));
    expect(mockSaveRoutine).toHaveBeenLastCalledWith(
      expect.objectContaining({ plannedDurationS: null }),
    );
  });

  test('a class has no exercises: switching takes them out, and Desfés brings them back', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    await chooseType(user, 'Força', 'Classe');

    expect(screen.queryByRole('button', { name: 'Afegeix exercicis' })).not.toBeOnTheScreen();
    expect(
      screen.getByText("Una classe no té exercicis: s'han tret 4 exercicis."),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));

    expect(screen.getByRole('button', { name: 'Tipus: Força' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Opcions de «Face pull»' })).toBeOnTheScreen();
    expect(guardsUnsavedChanges()).toBe(false);
  });

  test('plans each set, with the fields its tracking type logs', async () => {
    const user = userEvent.setup();
    const plank = { ...testExercise('plank', 'Planxa'), trackingType: 'duration' as const };
    jest.mocked(fetchRoutines).mockResolvedValue([
      {
        ...upperBody,
        exercises: [
          { ...upperBody.exercises[0], sets: [{ ...NO_TARGETS, reps: 12 }, NO_TARGETS] },
          {
            ...upperBody.exercises[1],
            id: 're-plank',
            exerciseId: 'plank',
            exercise: plank,
            sets: [NO_TARGETS],
          },
        ],
      },
    ]);
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    // A saved plan shows; a weight exercise asks for reps and kg in each set.
    expect(await screen.findByLabelText('Reps · Tracció al pit, sèrie 1')).toHaveDisplayValue('12');
    await user.type(screen.getByLabelText('kg · Tracció al pit, sèrie 1'), '40');
    await user.type(screen.getByLabelText('kg · Tracció al pit, sèrie 2'), '42,5');
    // A new set copies the one above it.
    await user.press(screen.getByRole('button', { name: 'Afegeix una sèrie a «Tracció al pit»' }));
    expect(screen.getByLabelText('kg · Tracció al pit, sèrie 3')).toHaveDisplayValue('42,5');
    // Tap a set's number to remove it.
    sheetChoices.push('Treu la sèrie');
    await user.press(screen.getByRole('button', { name: 'Sèrie 1 de «Tracció al pit»' }));
    expect(screen.queryByLabelText('kg · Tracció al pit, sèrie 3')).not.toBeOnTheScreen();
    // A plank asks for a time instead; its only set can't be removed.
    expect(screen.queryByLabelText('kg · Planxa, sèrie 1')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sèrie 1 de «Planxa»' })).not.toBeOnTheScreen();
    await user.type(screen.getByLabelText('min · Planxa, sèrie 1'), '1');
    await user.type(screen.getByLabelText('s · Planxa, sèrie 1'), '30');

    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    const saved = mockSaveRoutine.mock.lastCall?.[0];
    expect(saved?.exercises[0].sets).toEqual([
      expect.objectContaining({ target_reps: null, target_weight_kg: 42.5 }),
      expect.objectContaining({ target_reps: null, target_weight_kg: 42.5 }),
    ]);
    expect(saved?.exercises[1].sets).toEqual([
      expect.objectContaining({ target_duration_s: 90, target_weight_kg: null }),
    ]);
  });

  test('a run routine is made of blocks, each needing its distance or time', async () => {
    const user = userEvent.setup();
    const run = { ...testExercise('run', 'Córrer'), trackingType: 'run' as const };
    jest.mocked(fetchExercises).mockResolvedValue([run, testExercise('squat', 'Esquat amb barra')]);
    await render(<RoutineEditor routineId={null} onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });
    await user.type(screen.getByLabelText('Nom'), 'Sèries de dijous');
    await chooseType(user, 'Força', 'Córrer');

    // 6 × 400 m with 1:30 recovery, then a 2 km cool-down.
    sheetChoices.push('Sèries');
    await user.press(await screen.findByRole('button', { name: 'Afegeix un bloc' }));
    expect(screen.getByLabelText('6 repeticions')).toBeOnTheScreen();
    expect(screen.getByLabelText('Recuperació: 1:30')).toBeOnTheScreen();
    await user.type(screen.getByLabelText('metres · Bloc 1: Sèries'), '400');
    sheetChoices.push('Distància');
    await user.press(screen.getByRole('button', { name: 'Afegeix un bloc' }));

    // The distance block is still empty.
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));
    expect(screen.getByText('Posa la distància o el temps de cada bloc.')).toBeOnTheScreen();
    expect(screen.getByText('Posa la distància.')).toBeOnTheScreen();
    expect(mockSaveRoutine).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('km · Bloc 2: Distància'), '2');
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'run',
        exercises: [
          expect.objectContaining({
            exercise_id: 'run',
            rest_s: 90,
            sets: Array(6).fill(expect.objectContaining({ target_distance_m: 400 })),
          }),
          expect.objectContaining({
            exercise_id: 'run',
            sets: [expect.objectContaining({ target_distance_m: 2000 })],
          }),
        ],
      }),
    );
  });

  test('switching to Córrer takes out what isn’t a run, with Desfés', async () => {
    const user = userEvent.setup();
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    await chooseType(user, 'Força', 'Córrer');

    expect(
      screen.getByText("Una rutina de córrer només té blocs de córrer: s'han tret 4 exercicis."),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(screen.getByRole('button', { name: 'Opcions de «Face pull»' })).toBeOnTheScreen();
  });

  test('chooses the days of the week, all optional', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchRoutines).mockResolvedValue([{ ...upperBody, weekdays: [1] }]);
    await render(<RoutineEditor routineId="routine-1" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    const monday = await screen.findByRole('checkbox', { name: 'Dilluns' });
    expect(monday).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dijous' })).not.toBeChecked();

    await user.press(screen.getByRole('checkbox', { name: 'Dijous' }));
    await user.press(screen.getByRole('checkbox', { name: 'Dissabte' }));
    await user.press(monday);
    await user.press(screen.getByRole('button', { name: 'Desa la rutina' }));

    expect(mockSaveRoutine).toHaveBeenCalledWith(expect.objectContaining({ weekdays: [4, 6] }));
  });

  test('archives a saved routine and leaves, even with unsaved changes', async () => {
    const user = userEvent.setup();
    const onArchived = jest.fn();
    jest.mocked(setRoutineArchived).mockResolvedValue();
    await render(
      <RoutineEditor routineId="routine-1" onSaved={jest.fn()} onArchived={onArchived} />,
      { wrapper: createAppWrapper() },
    );
    await user.type(await screen.findByLabelText('Nom'), ' B');

    await user.press(screen.getByRole('button', { name: 'Arxiva la rutina' }));

    expect(setRoutineArchived).toHaveBeenCalledWith('routine-1', true);
    expect(screen.getByText("S'ha arxivat «Tren superior 1»")).toBeOnTheScreen();
    expect(onArchived).toHaveBeenCalled();
    expect(mockSaveRoutine).not.toHaveBeenCalled();
  });

  test('a new routine has nothing to archive', async () => {
    await render(<RoutineEditor routineId={null} onSaved={jest.fn()} onArchived={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(screen.queryByRole('button', { name: 'Arxiva la rutina' })).not.toBeOnTheScreen();
    // Let the exercise library finish loading before the test ends.
    await act(async () => {});
  });

  test('says so when the routine does not exist', async () => {
    await render(<RoutineEditor routineId="missing" onSaved={jest.fn()} />, {
      wrapper: createAppWrapper(),
    });

    expect(await screen.findByText("No s'ha trobat aquesta rutina.")).toBeOnTheScreen();
  });
});
