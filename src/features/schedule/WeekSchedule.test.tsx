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

import { fetchAdditions, replaceAdditions } from './additionsApi';
import { addToDay, moveToDay, removeFromDay } from './api';
import { fetchMoves, replaceMoves } from './movesApi';
import { fetchSportDrops, replaceSportDrops } from './sportDropsApi';
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
jest.mock('./sportDropsApi', () => ({
  fetchSportDrops: jest.fn(() => Promise.resolve([])),
  replaceSportDrops: jest.fn(() => Promise.resolve()),
}));
jest.mock('./additionsApi', () => ({
  fetchAdditions: jest.fn(() => Promise.resolve([])),
  replaceAdditions: jest.fn(() => Promise.resolve()),
}));
jest.mock('./movesApi', () => ({
  fetchMoves: jest.fn(),
  replaceMoves: jest.fn(() => Promise.resolve()),
}));
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
  jest.mocked(fetchAdditions).mockReset().mockResolvedValue([]);
  jest.mocked(replaceAdditions).mockReset().mockResolvedValue();
  jest.mocked(fetchSportDrops).mockReset().mockResolvedValue([]);
  jest.mocked(replaceSportDrops).mockReset().mockResolvedValue();
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(menus, 'show')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

const rows = () =>
  screen.getAllByRole('button', { name: /^Opcions de «/ }).map((row) => row.props.accessibilityLabel);

// The app starts in Catalan, so the tests use the Catalan texts. This week
// is Monday 19 to Sunday 25 October 2026; today is Wednesday 21.
describe('<WeekSchedule />', () => {
  test('this week: its dates, routines and sports in order, rest days, and today', async () => {
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Pàdel')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Aquesta setmana' })).toBeOnTheScreen();
    expect(screen.getByText('19 d’oct. – 25 d’oct.')).toBeOnTheScreen();
    expect(screen.getByText('3 entrenaments · 2 esports · 5 dies de descans')).toBeOnTheScreen();
    expect(fetchMoves).toHaveBeenLastCalledWith('2026-10-19', '2026-10-25');
    expect(rows()).toEqual([
      'Opcions de «Tren superior», Dilluns 19',
      'Opcions de «Sèries», Dilluns 19',
      'Opcions de «Pàdel», Dilluns 19',
      'Opcions de «Tren superior», Dijous 22',
      'Opcions de «Bàsquet», Dijous 22',
    ]);
    expect(screen.getByText('3 activitats')).toBeOnTheScreen();
    // Its description, and an estimate of its time (4 × 3 sets).
    expect(screen.getAllByText('Rutina · Esquena i bíceps · ~25 min')).toHaveLength(2);
    expect(screen.getByText('Esport · 19:00 · 1 h 30 min')).toBeOnTheScreen();
    expect(screen.getAllByText('Dia de descans')).toHaveLength(5);
    expect(screen.getByRole('header', { name: 'Dimecres 21' })).toBeOnTheScreen();
    expect(screen.getByText('Avui')).toBeOnTheScreen();
    // Nothing changed: nothing to undo.
    expect(screen.queryByRole('button', { name: 'Desfés els canvis' })).toBeNull();
  });

  test('‹ › go from this week up to four weeks ahead', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('button', { name: 'Setmana anterior' })).toBeDisabled();
    await user.press(screen.getByRole('button', { name: 'Setmana següent' }));
    expect(screen.getByRole('header', { name: 'La setmana que ve' })).toBeOnTheScreen();
    expect(screen.getByText('26 d’oct. – 1 de nov.')).toBeOnTheScreen();
    expect(fetchMoves).toHaveBeenLastCalledWith('2026-10-26', '2026-11-01');
    expect(fetchAdditions).toHaveBeenLastCalledWith('2026-10-26', '2026-11-01');
    expect(fetchSportDrops).toHaveBeenLastCalledWith('2026-10-26', '2026-11-01');
    // The usual week again, with that week's dates.
    expect(screen.getByRole('header', { name: 'Dilluns 26' })).toBeOnTheScreen();
    expect(screen.queryByText('Avui')).toBeNull();

    for (let week = 2; week <= 4; week += 1) {
      await user.press(screen.getByRole('button', { name: 'Setmana següent' }));
    }
    expect(screen.getByRole('header', { name: "D'aquí a 4 setmanes" })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Setmana següent' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: 'Setmana anterior' }));
    expect(screen.getByRole('header', { name: "D'aquí a 3 setmanes" })).toBeOnTheScreen();
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
    await user.press(
      screen.getByRole('button', { name: 'Dijous: Tren superior, Bàsquet. Ves-hi a la llista' }),
    );
    await user.press(monday);
    expect(onScrollTo).toHaveBeenCalledTimes(2);
    expect(onScrollTo.mock.calls.every(([y]) => typeof y === 'number')).toBe(true);
  });

  test('"Mou a un altre dia…" → Cada setmana: the usual week, with Desfés', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    // Tren superior is on Monday and Thursday: Thursday isn't offered.
    sheetChoices.push('Mou a un altre dia…', 'Dimecres', 'Cada setmana');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Tren superior», Dilluns 19' }));
    expect(actionSheet.mock.calls[1]?.[0].options).toEqual([
      'Dimarts',
      'Dimecres',
      'Divendres',
      'Dissabte',
      'Diumenge',
      'Cancel·la',
    ]);
    expect(actionSheet.mock.lastCall?.[0]).toMatchObject({
      title: 'Moure «Tren superior» al dimecres',
      options: ['Només aquesta setmana', 'Cada setmana', 'Cancel·la'],
    });
    await waitFor(() =>
      expect(moveToDay).toHaveBeenCalledWith({ routineId: 'upper', from: 1, to: 3, position: 0 }),
    );
    expect(await screen.findByText('Dimecres: hi has mogut «Tren superior»')).toBeOnTheScreen();
    expect(replaceMoves).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    await waitFor(() =>
      expect(moveToDay).toHaveBeenLastCalledWith({ routineId: 'upper', from: 3, to: 1, position: 0 }),
    );
  });

  test('"Mou a un altre dia…" → Només aquesta setmana: a move that week only', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push('Mou a un altre dia…', 'Dimecres', 'Només aquesta setmana');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Tren superior», Dilluns 19' }));
    await waitFor(() =>
      expect(replaceMoves).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
        { routineId: 'upper', plannedDate: '2026-10-19', movedTo: '2026-10-21', position: 0 },
      ]),
    );
    // The usual week is left as it was.
    expect(moveToDay).not.toHaveBeenCalled();
  });

  test('a sport moved this week only: off its day, and a copy on the new one', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push('Mou a un altre dia…', 'Divendres', 'Només aquesta setmana');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' }));
    await waitFor(() =>
      expect(replaceSportDrops).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
        { sportId: 'padel', date: '2026-10-19' },
      ]),
    );
    expect(replaceAdditions).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
      {
        id: 'new-sport',
        date: '2026-10-23',
        routineId: null,
        sport: 'padel',
        customName: null,
        startTime: '19:00',
        durationS: 5400,
        position: 0,
      },
    ]);
    expect(moveWeeklySport).not.toHaveBeenCalled();
  });

  test('a sport moved every week, from its menu', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push('Mou a un altre dia…', 'Divendres', 'Cada setmana');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' }));
    await waitFor(() => expect(moveWeeklySport).toHaveBeenCalledWith('padel', 5, 0));
  });

  test("a row dragged onto another day's card asks, then moves; onto its own, nothing", async () => {
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' });
    // One drop zone per day, Monday first.
    const zones = screen.getAllByTestId('sortable-zone');
    expect(zones).toHaveLength(7);

    await startDrag('routine:run');
    await fireEvent(zones[0], 'itemDrop');
    expect(actionSheet).not.toHaveBeenCalled();

    sheetChoices.push('Cada setmana');
    await startDrag('routine:run');
    await fireEvent(zones[5], 'itemEnter');
    await fireEvent(zones[5], 'itemDrop');
    await waitFor(() =>
      expect(moveToDay).toHaveBeenCalledWith({ routineId: 'run', from: 1, to: 6, position: 0 }),
    );
  });

  test('a routine dropped on a day that already has it stays, and says why', async () => {
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });
    await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' });

    // Thursday's (the last list a key is rendered in) onto Monday.
    await startDrag('routine:upper');
    await fireEvent(screen.getAllByTestId('sortable-zone')[0], 'itemDrop');
    expect(await screen.findByText('Dilluns ja té «Tren superior»')).toBeOnTheScreen();
    expect(actionSheet).not.toHaveBeenCalled();
    expect(moveToDay).not.toHaveBeenCalled();
  });

  test('a week\'s own changes: counted from that week, and "Desfés els canvis" undoes them all', async () => {
    const user = userEvent.setup();
    jest
      .mocked(fetchMoves)
      .mockResolvedValue([
        { routineId: 'upper', plannedDate: '2026-10-22', movedTo: '2026-10-23', position: 1 },
      ]);
    jest.mocked(fetchSportDrops).mockResolvedValue([{ sportId: 'basket', date: '2026-10-22' }]);
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(
      await screen.findByRole('button', { name: 'Opcions de «Tren superior», Divendres 23' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Bàsquet')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Desfés els canvis' }));
    await waitFor(() => expect(replaceMoves).toHaveBeenCalledWith('2026-10-19', '2026-10-25', []));
    expect(replaceSportDrops).toHaveBeenCalledWith('2026-10-19', '2026-10-25', []);
    expect(replaceAdditions).toHaveBeenCalledWith('2026-10-19', '2026-10-25', []);
    expect(await screen.findByText("S'han desfet els canvis de la setmana")).toBeOnTheScreen();
  });

  test('+ Afegeix → "Crea una rutina nova": every week, the editor with that day chosen', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dimarts 20: afegeix una activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Cada setmana' }));
    await user.press(screen.getByRole('button', { name: 'Crea una rutina nova per al Dimarts' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/new',
      params: { weekday: '2' },
    });
  });

  test('+ Afegeix a routine every week: only the ones not on that day, after what is there', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dilluns 19: afegeix una activitat' }));
    expect(screen.getByRole('header', { name: 'Afegeix al Dilluns' })).toBeOnTheScreen();
    // This week only, unless said.
    expect(screen.getByRole('radio', { name: 'Només aquesta setmana' })).toBeChecked();
    await user.press(screen.getByRole('radio', { name: 'Cada setmana' }));
    expect(screen.queryByRole('radio', { name: 'Tren superior' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Cames' }));
    await user.press(screen.getByRole('button', { name: 'Afegeix «Cames» al dilluns' }));

    expect(addToDay).toHaveBeenCalledWith({ routineId: 'legs', weekday: 1, position: 3 }, 'user-1');
    expect(replaceAdditions).not.toHaveBeenCalled();
  });

  test('+ Afegeix a routine this week only, then off again without asking', async () => {
    const user = userEvent.setup();
    jest.mocked(replaceAdditions).mockImplementation((_from, _to, additions) => {
      jest.mocked(fetchAdditions).mockResolvedValue([...additions]);
      return Promise.resolve();
    });
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dilluns 19: afegeix una activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Cames' }));
    await user.press(screen.getByRole('button', { name: 'Afegeix «Cames» al dilluns' }));

    await waitFor(() =>
      expect(replaceAdditions).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
        {
          id: 'new-sport',
          date: '2026-10-19',
          routineId: 'legs',
          sport: null,
          customName: null,
          startTime: null,
          durationS: null,
          // After Tren superior, Sèries and the padel.
          position: 3,
        },
      ]),
    );
    expect(addToDay).not.toHaveBeenCalled();

    // Only this week's: taken off with no question.
    sheetChoices.push("Treu-ho d'aquest dia");
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Cames», Dilluns 19' }));
    await waitFor(() =>
      expect(replaceAdditions).toHaveBeenLastCalledWith('2026-10-19', '2026-10-25', []),
    );
    expect(actionSheet).toHaveBeenCalledTimes(1);
  });

  test('+ Afegeix a sport every week, with a time and a duration', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dimecres 21: afegeix una activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Cada setmana' }));
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

  test('+ Afegeix a sport this week only', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dimecres 21: afegeix una activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Esport' }));
    await user.press(screen.getByRole('radio', { name: 'Escalada' }));
    await user.press(screen.getByRole('button', { name: 'Afegeix «Escalada» al dimecres' }));

    await waitFor(() =>
      expect(replaceAdditions).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
        expect.objectContaining({ date: '2026-10-21', sport: 'climbing', routineId: null }),
      ]),
    );
    expect(await screen.findByText('Dimecres: «Escalada» afegit només aquesta setmana')).toBeOnTheScreen();
    expect(addWeeklySport).not.toHaveBeenCalled();
  });

  test('"Altres" needs a name of your own', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Dissabte 24: afegeix una activitat' }));
    await user.press(screen.getByRole('radio', { name: 'Cada setmana' }));
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

  test('a sport: change its time every week, or take it off that week only', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push("Canvia l'hora i la durada");
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' }));
    expect(screen.getByRole('header', { name: 'Pàdel' })).toBeOnTheScreen();
    await user.clear(screen.getByLabelText('Hora (opcional)'));
    await user.type(screen.getByLabelText('Hora (opcional)'), '1830');
    sheetChoices.push('Cada setmana');
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(updateWeeklySport).toHaveBeenCalledWith('padel', { startTime: '18:30', durationS: 5400 }),
    );
    expect(actionSheet.mock.lastCall?.[0].title).toBe("Canviar l'hora de «Pàdel»");

    sheetChoices.push("Treu-ho d'aquest dia", 'Només aquesta setmana');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' }));
    await waitFor(() =>
      expect(replaceSportDrops).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
        { sportId: 'padel', date: '2026-10-19' },
      ]),
    );
    expect(removeWeeklySport).not.toHaveBeenCalled();
    expect(await screen.findByText('Dilluns: «Pàdel» fora aquesta setmana')).toBeOnTheScreen();
  });

  test("a sport's time changed that week only: off that day, and a copy at the new time", async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push("Canvia l'hora i la durada");
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' }));
    await user.clear(screen.getByLabelText('Hora (opcional)'));
    await user.type(screen.getByLabelText('Hora (opcional)'), '1830');
    sheetChoices.push('Només aquesta setmana');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() =>
      expect(replaceSportDrops).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
        { sportId: 'padel', date: '2026-10-19' },
      ]),
    );
    expect(replaceAdditions).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
      expect.objectContaining({ date: '2026-10-19', sport: 'padel', startTime: '18:30', position: 2 }),
    ]);
    expect(updateWeeklySport).not.toHaveBeenCalled();
  });

  test('a sport taken off every week, with Desfés', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push("Treu-ho d'aquest dia", 'Cada setmana');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Pàdel», Dilluns 19' }));
    expect(actionSheet.mock.lastCall?.[0].title).toBe('Treure «Pàdel»');
    await waitFor(() => expect(removeWeeklySport).toHaveBeenCalledWith('padel'));
    expect(screen.getByText("Dilluns: s'ha tret «Pàdel»")).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    await waitFor(() => expect(addWeeklySport).toHaveBeenCalledWith(expect.objectContaining({ id: 'padel' })));
  });

  test('a routine: open it, or take it off every week with Desfés, or that week only', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    sheetChoices.push('Obre la rutina');
    await user.press(await screen.findByRole('button', { name: 'Opcions de «Sèries», Dilluns 19' }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/plan/routines/[id]', params: { id: 'run' } });

    sheetChoices.push("Treu-ho d'aquest dia", 'Cada setmana');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Sèries», Dilluns 19' }));
    expect(removeFromDay).toHaveBeenCalledWith('run', 1);
    await user.press(await screen.findByRole('button', { name: 'Desfés' }));
    expect(addToDay).toHaveBeenCalledWith({ routineId: 'run', weekday: 1, position: 1 }, 'user-1');

    sheetChoices.push("Treu-ho d'aquest dia", 'Només aquesta setmana');
    await user.press(screen.getByRole('button', { name: 'Opcions de «Tren superior», Dijous 22' }));
    await waitFor(() =>
      expect(replaceMoves).toHaveBeenCalledWith('2026-10-19', '2026-10-25', [
        { routineId: 'upper', plannedDate: '2026-10-22', movedTo: null, position: 0 },
      ]),
    );
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
        'Opcions de «Bàsquet», Dijous 22',
        'Opcions de «Tren superior», Dijous 22',
      ]),
    );
  });

  test('without routines, the sheet says to create one first', async () => {
    const user = userEvent.setup();
    jest.mocked(fetchRoutines).mockResolvedValue([]);
    jest.mocked(fetchWeeklySports).mockResolvedValue([]);
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(await screen.findAllByText('Dia de descans')).toHaveLength(7);
    await user.press(screen.getByRole('button', { name: 'Dilluns 19: afegeix una activitat' }));
    expect(screen.getByText(/Encara no tens rutines/)).toBeOnTheScreen();
  });
});
