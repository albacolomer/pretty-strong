import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ActionSheetIOS } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchRoutines } from '@/features/routines/api';
import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { addToDay, removeFromDay } from './api';
import { weekdayOf } from './dates';
import { WeekSchedule } from './WeekSchedule';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('./api', () => ({ addToDay: jest.fn(), removeFromDay: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const routine = (id: string, name: string, dayPositions: Routine['dayPositions']): Routine => ({
  ...upperBody,
  id,
  name,
  weekdays: Object.keys(dayPositions)
    .map(Number)
    .sort((a, b) => a - b) as Routine['weekdays'],
  dayPositions,
});

// Monday: Tren superior, then Sèries; Thursday: Tren superior; Cames on no day.
const upper = routine('upper', 'Tren superior', { 1: 0, 4: 0 });
const intervals = { ...routine('run', 'Sèries', { 1: 1 }), label: 'run' as const };
const legs = routine('legs', 'Cames', {});

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
  jest.mocked(addToDay).mockReset().mockResolvedValue();
  jest.mocked(removeFromDay).mockReset().mockResolvedValue();
  sheetChoices.length = 0;
  actionSheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((options, callback) =>
      callback(options.options.indexOf(sheetChoices.shift() ?? '')),
    );
});

afterEach(() => actionSheet.mockRestore());

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<WeekSchedule />', () => {
  test('shows Monday to Sunday with their routines in order, rest days, and today', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: 'Dilluns' })).toBeOnTheScreen();
    const routineButtons = screen.getAllByRole('button', { name: /Opcions de/ });
    expect(routineButtons.map((button) => button.props.accessibilityLabel)).toEqual([
      'Opcions de «Tren superior», Dilluns',
      'Opcions de «Sèries», Dilluns',
      'Opcions de «Tren superior», Dijous',
    ]);
    // Five days with nothing planned.
    expect(screen.getAllByText('Descans')).toHaveLength(5);
    // "Avui" sits next to today's name.
    const today = LONG_NAMES[weekdayOf(new Date()) - 1];
    expect(screen.getByText('Avui')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: today })).toBeOnTheScreen();

    await user.press(screen.getAllByRole('button', { name: /^Sèries/ })[0]);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/[id]',
      params: { id: 'run' },
    });
  });

  test('adds a routine to a day, after the ones already there', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    const addButton = await screen.findByRole('button', { name: 'Dilluns: afegeix una rutina' });
    // What the database holds once it's saved.
    jest.mocked(fetchRoutines).mockResolvedValue([upper, intervals, routine('legs', 'Cames', { 1: 2 })]);
    sheetChoices.push('Cames');
    await user.press(addButton);

    expect(addToDay).toHaveBeenCalledWith({ routineId: 'legs', weekday: 1, position: 2 }, 'user-1');
    expect(await screen.findByRole('button', { name: 'Opcions de «Cames», Dilluns' })).toBeOnTheScreen();
    // Only routines not on the day yet are offered.
    expect(actionSheet.mock.lastCall?.[0].options).toEqual(['Cames', 'Cancel·la']);
  });

  test('takes a routine off a day, with Desfés', async () => {
    const user = userEvent.setup();
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    const menu = await screen.findByRole('button', { name: 'Opcions de «Sèries», Dilluns' });
    // What the database holds once it's saved.
    jest.mocked(fetchRoutines).mockResolvedValue([upper, routine('run', 'Sèries', {}), legs]);
    sheetChoices.push("Treu-la d'aquest dia");
    await user.press(menu);

    expect(removeFromDay).toHaveBeenCalledWith('run', 1);
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Opcions de «Sèries», Dilluns' }),
      ).not.toBeOnTheScreen(),
    );
    expect(screen.getByText("Dilluns: s'ha tret «Sèries»")).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Desfés' }));
    expect(addToDay).toHaveBeenCalledWith({ routineId: 'run', weekday: 1, position: 1 }, 'user-1');
  });

  test('without routines, says to create one first', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([]);
    await render(<WeekSchedule />, { wrapper: createAppWrapper() });

    expect(await screen.findByText(/Encara no tens rutines/)).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Dilluns' })).not.toBeOnTheScreen();
  });
});
