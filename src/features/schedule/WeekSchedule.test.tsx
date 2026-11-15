import '@/lib/i18n';

import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { menus } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchRoutines } from '@/features/routines/api';
import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { drop, startDrag } from '@/test-utils/sortablesMock';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchSessions } from '@/features/workout/api';

import { addToDay, moveToDay, removeFromDay } from './api';
import { fetchMoves, replaceMoves } from './movesApi';
import type { WeeklySport } from './sports';
import {
  addWeeklySport,
  fetchWeeklySports,
  moveWeeklySport,
  removeWeeklySport,
  reorderDay,
  updateWeeklySport,
} from './sportsApi';
import { WeekSchedule } from './WeekSchedule';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('./api', () => ({ addToDay: jest.fn(), removeFromDay: jest.fn(), moveToDay: jest.fn() }));
jest.mock('./sportsApi', () => ({
  fetchWeeklySports: jest.fn(),
  addWeeklySport: jest.fn(() => Promise.resolve()),
  updateWeeklySport: jest.fn(() => Promise.resolve()),
  removeWeeklySport: jest.fn(() => Promise.resolve()),
  moveWeeklySport: jest.fn(() => Promise.resolve()),
  reorderDay: jest.fn(() => Promise.resolve()),
}));
jest.mock('./movesApi', () => ({
  fetchMoves: jest.fn(),
  replaceMoves: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/features/workout/api', () => ({ fetchSessions: jest.fn() }));
// Wednesday 21 October 2026.
jest.mock('./useToday', () => ({ useToday: () => new Date(2026, 9, 21) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'new-sport' }));
jest.mock('react-native-sortables', () => jest.requireActual('@/test-utils/sortablesMock'));

const routine = (id: string, name: string, dayPositions: Routine['dayPositions']): Routine => ({
  ...upperBody,
  id,
  name,
  weekdays: Object.keys(dayPositions)
    .map(Number)
    .sort((a, b) => a - b) as Routine['weekdays'],
  dayPositions,
});

// Monday: Tren superior, Sèries, then padel; Thursday: Tren superior, then
// basketball. Cames on no day.
const upper = { ...routine('upper', 'Tren superior', { 1: 0, 4: 0 }), description: 'Esquena i bíceps' };
const intervals = { ...routine('run', 'Sèries', { 1: 1 }), label: 'run' as const, exercises: [] };
const legs = routine('legs', 'Cames', {});
const padel: WeeklySport = {
  id: 'padel',
  weekday: 1,
  sport: 'padel',
  customName: null,
  startTime: '19:00',
  durationS: 5400,
  position: 2,
};
const basketball: WeeklySport = {
  id: 'basket',
  weekday: 4,
  sport: 'basketball',
  customName: null,
  startTime: '20:30',
  durationS: 3600,
  position: 1,
};


// Each native action sheet picks the next of these labels.
const sheetChoices: string[] = [];
let actionSheet: jest.SpyInstance;

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(fetchRoutines).mockResolvedValue([upper, intervals, legs]);
  jest.mocked(fetchWeeklySports).mockResolvedValue([padel, basketball]);
  jest.mocked(addToDay).mockReset().mockResolvedValue();
  jest.mocked(removeFromDay).mockReset().mockResolvedValue();
  jest.mocked(moveToDay).mockReset().mockResolvedValue();
  jest.mocked(moveWeeklySport).mockClear();
  jest.mocked(addWeeklySport).mockClear();
  jest.mocked(updateWeeklySport).mockClear();
  jest.mocked(removeWeeklySport).mockClear();
  jest.mocked(reorderDay).mockClear();
  jest.mocked(fetchMoves).mockReset().mockResolvedValue([]);
  jest.mocked(replaceMoves).mockClear();
  jest.mocked(fetchSessions).mockReset().mockResolvedValue([]);
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(menus, 'show')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

const rows = () =>
  screen.getAllByRole('button', { name: /^Opcions de/ }).map((row) => row.props.accessibilityLabel);

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<WeekSchedule />', () => {
  test('the usual week: routines and sports in order, rest days, and today', async () => {
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Pàdel')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'La teva setmana' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Dia a dia' })).toBeOnTheScreen();
    expect(
      screen.getByText('3 entrenaments · 2 esports · 5 dies de descans. Es repeteix cada setmana.'),
    ).toBeOnTheScreen();
    expect(rows()).toEqual([
      'Opcions de «Tren superior», Dilluns',
      'Opcions de «Sèries», Dilluns',
      'Opcions de «Pàdel», Dilluns',
      'Opcions de «Tren superior», Dijous',
      'Opcions de «Bàsquet», Dijous',
    ]);
    expect(screen.getByText('3 activitats')).toBeOnTheScreen();
    // Its description, and an estimate of its time (4 × 3 sets).
    expect(screen.getAllByText('Rutina · Esquena i bíceps · ~25 min')).toHaveLength(2);
    expect(screen.getByText('Esport · 19:00 · 1 h 30 min')).toBeOnTheScreen();
    expect(screen.getAllByText('Dia de descans')).toHaveLength(5);
    expect(screen.getByRole('header', { name: 'Dimecres' })).toBeOnTheScreen();
    expect(screen.getByText('Avui')).toBeOnTheScreen();
  });

  test('the week strip: each day at a glance; a tap scrolls down to it in the list', async () => {
    const user = userEvent.setup();
    const onScrollTo = jest.fn();
    await render(<WeekSchedule onScrollTo={onScrollTo} />, { wrapper: createAppWrapper() });

    const monday = await screen.findByRole('button', {
      name: 'Dilluns: Tren superior, Sèries, Pàdel. Ves-hi a la llista',
    });
    expect(
      screen.getByRole('button', { name: 'Dimarts: Dia de descans. Ves-hi a la llista' }),
    ).toBeOnTheScreen();

    // Each day's card, as laid out in the list.
    const cards = screen.getAllByRole('header', { name: /^(Dilluns|Dijous)$/ });
    expect(cards).toHaveLength(2);
    await user.press(
      screen.getByRole('button', { name: 'Dijous: Tren superior, Bàsquet. Ves-hi a la llista' }),
    );
    await user.press(monday);
    expect(onScrollTo).toHaveBeenCalledTimes(2);
    expect(onScrollTo.mock.calls.every(([y]) => typeof y === 'number')).toBe(true);
  });

  test('"Mou a un altre dia…": only the days it isn\'t on, at the end there, with Desfés', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    // Tren superior is on Monday and Thursday: Thursday isn't offered.
    sheetChoices.push('Mou a un altre dia…', 'Dimecres');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Tren superior», Dilluns' }));
    expect(actionSheet.mock.lastCall?.[0].options).toEqual([
      'Dimarts',
      'Dimecres',
      'Divendres',
      'Dissabte',
      'Diumenge',
      'Cancel·la',
    ]);
    await waitFor(() =>
      expect(moveToDay).toHaveBeenCalledWith({ routineId: 'upper', from: 1, to: 3, position: 0 }),
    );
    expect(await screen.findByText('Dimecres: hi has mogut «Tren superior»')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    await waitFor(() =>
      expect(moveToDay).toHaveBeenLastCalledWith({ routineId: 'upper', from: 3, to: 1, position: 0 }),
    );
  });

  test('a sport moves to another day from its menu too', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push('Mou a un altre dia…', 'Divendres');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns' }));
    await waitFor(() => expect(moveWeeklySport).toHaveBeenCalledWith('padel', 5, 0));
  });

  test('a row dragged onto another day\'s card moves there; onto its own, nothing', async () => {
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns' });
    // One drop zone per day, Monday first.
    const zones = screen.getAllByTestId('sortable-zone');
    expect(zones).toHaveLength(7);

    await startDrag('routine:run');
    await fireEvent(zones[0], 'itemDrop');
    expect(moveToDay).not.toHaveBeenCalled();

    await startDrag('routine:run');
    await fireEvent(zones[5], 'itemEnter');
    await fireEvent(zones[5], 'itemDrop');
    await waitFor(() =>
      expect(moveToDay).toHaveBeenCalledWith({ routineId: 'run', from: 1, to: 6, position: 0 }),
    );
  });

  test('a routine dropped on a day that already has it stays, and says why', async () => {
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns' });

    // Thursday's (the last list a key is rendered in) onto Monday.
    await startDrag('routine:upper');
    await fireEvent(screen.getAllByTestId('sortable-zone')[0], 'itemDrop');
    expect(moveToDay).not.toHaveBeenCalled();
    expect(await screen.findByText('Dilluns ja té «Tren superior»')).toBeOnTheScreen();
  });

  test('the week that comes: its dates, the usual plan, and a move there for that week only', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('radio', { name: 'La que ve' }));
    expect(screen.getByRole('header', { name: /^La setmana que ve · / })).toBeOnTheScreen();
    expect(fetchMoves).toHaveBeenLastCalledWith('2026-10-26', '2026-11-01');
    expect(screen.getByRole('header', { name: 'Dilluns 26' })).toBeOnTheScreen();
    // Adding just for one week comes later.
    expect(screen.queryByRole('button', { name: 'Dilluns 26: afegeix una activitat' })).toBeNull();

    sheetChoices.push('Mou a un altre dia…', 'Dimecres');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tren superior», Dilluns 26' }));
    expect(actionSheet.mock.calls.at(-2)?.[0].options).toEqual([
      'Obre la rutina',
      'Mou a un altre dia…',
      'Treu-la només aquesta setmana',
      'Cancel·la',
    ]);
    await waitFor(() =>
      expect(replaceMoves).toHaveBeenCalledWith('2026-10-26', '2026-11-01', [
        { routineId: 'upper', plannedDate: '2026-10-26', movedTo: '2026-10-28', position: 0 },
      ]),
    );
    // The usual week is left as it was.
    expect(moveToDay).not.toHaveBeenCalled();
  });

  test('this week: gone days and done routines stay put', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchSessions).mockResolvedValue([
      {
        id: 'done',
        date: '2026-10-22',
        plannedRoutineId: 'upper',
        routineId: 'upper',
        status: 'completed',
        logMode: 'live',
        durationS: 3600,
        startedAt: null,
        notes: null,
        changeReason: null,
        plannedSportId: null,
        sport: null,
        sportName: null,
        plannedEventId: null,
        eventKind: null,
        eventName: null,
      },
    ]);
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await user.press(await screen.findByRole('radio', { name: 'Aquesta' }));

    // Monday has gone: only to look at.
    sheetChoices.push('');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Sèries», Dilluns 19' }));
    expect(actionSheet.mock.lastCall?.[0].options).toEqual(['Obre la rutina', 'Cancel·la']);
    // Thursday's Tren superior is done already.
    await waitFor(() => expect(fetchSessions).toHaveBeenCalledWith('2026-10-19', '2026-10-25'));
    sheetChoices.push('');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tren superior», Dijous 22' }));
    expect(actionSheet.mock.lastCall?.[0].options).toEqual(['Obre la rutina', 'Cancel·la']);
  });

  test('a week\'s changes are counted, and "Torna a l\'habitual" undoes them all', async () => {
    const user = userEvent.setup();
    jest
      .mocked(fetchMoves)
      .mockResolvedValue([
        { routineId: 'upper', plannedDate: '2026-10-29', movedTo: '2026-10-30', position: 1 },
      ]);
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await user.press(await screen.findByRole('radio', { name: 'La que ve' }));

    expect(await screen.findByText("1 canvi respecte a l'habitual")).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Opcions de «Tren superior», Divendres 30' }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: "Torna a l'habitual" }));
    await waitFor(() => expect(replaceMoves).toHaveBeenCalledWith('2026-10-26', '2026-11-01', []));
  });

  test('in a dated week, a sport is changed in the usual week', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await user.press(await screen.findByRole('radio', { name: 'La que ve' }));

    sheetChoices.push('Ves a la setmana habitual');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Pàdel», Dilluns 26' }));
    expect(screen.getByRole('header', { name: 'La teva setmana' })).toBeOnTheScreen();
  });

  test('+ Afegeix → "Crea una rutina nova": the editor, with that day chosen', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dimarts: afegeix una activitat' }));
    await user.press(screen.getByRole('button', { name: 'Crea una rutina nova per al Dimarts' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/new',
      params: { weekday: '2' },
    });
  });

  test('+ Afegeix a routine: only the ones not on that day, after what is there', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dilluns: afegeix una activitat' }));
    expect(screen.getByRole('header', { name: 'Afegeix al Dilluns' })).toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Tren superior' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Cames' }));
    await user.press(screen.getByRole('button', { name: 'Afegeix «Cames» al dilluns' }));

    expect(addToDay).toHaveBeenCalledWith({ routineId: 'legs', weekday: 1, position: 3 }, 'user-1');
  });

  test('+ Afegeix a sport, with a time and a duration', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dimecres: afegeix una activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Esport' }));
    await user.press(screen.getByRole('radio', { name: 'Pàdel' }));
    await user.type(screen.getByLabelText('Hora (opcional)'), '1900');
    expect(screen.getByLabelText('Hora (opcional)').props.value).toBe('19:00');
    await user.type(screen.getByLabelText('Durada (min, opcional)'), '90');
    await user.press(screen.getByRole('button', { name: 'Afegeix «Pàdel» al dimecres' }));

    await waitFor(() =>
      expect(addWeeklySport).toHaveBeenCalledWith({
        id: 'new-sport',
        weekday: 3,
        sport: 'padel',
        customName: null,
        startTime: '19:00',
        durationS: 5400,
        position: 0,
      }),
    );
  });

  test('"Altres" needs a name of your own', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dissabte: afegeix una activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Esport' }));
    await user.press(screen.getByRole('radio', { name: 'Altres' }));
    expect(screen.getByRole('button', { name: 'Afegeix «Altres» al dissabte' })).toBeDisabled();
    await user.type(screen.getByLabelText('Nom'), 'Esquaix');
    await user.press(screen.getByRole('button', { name: 'Afegeix «Esquaix» al dissabte' }));

    await waitFor(() =>
      expect(addWeeklySport).toHaveBeenCalledWith(
        expect.objectContaining({ sport: 'other', customName: 'Esquaix', weekday: 6 }),
      ),
    );
  });

  test('a sport: change its time, or take it off the day with Desfés', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push("Canvia l'hora i la durada");
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns' }));
    expect(screen.getByRole('header', { name: 'Pàdel' })).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Hora (opcional)'));
    await user.type(screen.getByLabelText('Hora (opcional)'), '1830');
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(updateWeeklySport).toHaveBeenCalledWith('padel', { startTime: '18:30', durationS: 5400 }),
    );

    sheetChoices.push("Treu-ho d'aquest dia");
    await user.press(screen.getByRole('button', { name: 'Opcions de «Pàdel», Dilluns' }));
    await waitFor(() => expect(removeWeeklySport).toHaveBeenCalledWith('padel'));
    expect(screen.getByText("Dilluns: s'ha tret «Pàdel»")).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    await waitFor(() => expect(addWeeklySport).toHaveBeenCalledWith(expect.objectContaining({ id: 'padel' })));
  });

  test('a routine: open it, or take it off the day with Desfés', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push('Obre la rutina');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Sèries», Dilluns' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/plan/routines/[id]', params: { id: 'run' } });

    sheetChoices.push("Treu-ho d'aquest dia");
    await user.press(screen.getByRole('button', { name: 'Opcions de «Sèries», Dilluns' }));
    expect(removeFromDay).toHaveBeenCalledWith('run', 1);
    await user.press(await screen.findByRole('button', { name: 'Desfés' }));
    expect(addToDay).toHaveBeenCalledWith({ routineId: 'run', weekday: 1, position: 1 }, 'user-1');
  });

  test('dragging reorders a day, routines and sports together', async () => {
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await screen.findByText('Bàsquet');

    // What the database holds once it's saved.
    jest.mocked(fetchWeeklySports).mockResolvedValue([padel, { ...basketball, position: 0 }]);
    jest
      .mocked(fetchRoutines)
      .mockResolvedValue([{ ...upper, dayPositions: { 1: 0, 4: 1 } }, intervals, legs]);
    // Thursday's list is the last one drawn: basketball first.
    await drop(1, 0);

    await waitFor(() =>
      expect(reorderDay).toHaveBeenCalledWith(4, [
        { kind: 'sport', id: 'basket' },
        { kind: 'routine', id: 'upper' },
      ]),
    );
    await waitFor(() =>
      expect(rows().slice(3)).toEqual([
        'Opcions de «Bàsquet», Dijous',
        'Opcions de «Tren superior», Dijous',
      ]),
    );
  });

  test('without routines, the sheet says to create one first', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchRoutines).mockResolvedValue([]);
    jest.mocked(fetchWeeklySports).mockResolvedValue([]);
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(await screen.findAllByText('Dia de descans')).toHaveLength(7);
    await user.press(screen.getByRole('button', { name: 'Dilluns: afegeix una activitat' }));
    expect(screen.getByText(/Encara no tens rutines/)).toBeOnTheScreen();
  });
});
