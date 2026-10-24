import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ActionSheetIOS } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchRoutines } from '@/features/routines/api';
import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { drop } from '@/test-utils/sortablesMock';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { addToDay, removeFromDay } from './api';
import { weekdayOf } from './dates';
import type { WeeklySport } from './sports';
import {
  addWeeklySport,
  fetchWeeklySports,
  removeWeeklySport,
  reorderDay,
  updateWeeklySport,
} from './sportsApi';
import { WeekSchedule } from './WeekSchedule';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('./api', () => ({ addToDay: jest.fn(), removeFromDay: jest.fn() }));
jest.mock('./sportsApi', () => ({
  fetchWeeklySports: jest.fn(),
  addWeeklySport: jest.fn(() => Promise.resolve()),
  updateWeeklySport: jest.fn(() => Promise.resolve()),
  removeWeeklySport: jest.fn(() => Promise.resolve()),
  reorderDay: jest.fn(() => Promise.resolve()),
}));
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

const LONG_NAMES = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

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
  jest.mocked(addWeeklySport).mockClear();
  jest.mocked(updateWeeklySport).mockClear();
  jest.mocked(removeWeeklySport).mockClear();
  jest.mocked(reorderDay).mockClear();
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
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
    expect(screen.getByRole('header', { name: 'La teva setmana habitual' })).toBeOnTheScreen();
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
    const today = LONG_NAMES[weekdayOf(new Date()) - 1];
    expect(screen.getByRole('header', { name: today })).toBeOnTheScreen();
    expect(screen.getByText('Avui')).toBeOnTheScreen();
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
