import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchRoutines } from '@/features/routines/api';
import type { Routine } from '@/features/routines/routine';
import { upperBody } from '@/features/routines/testData';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { Today } from './Today';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
// Today is Tuesday 20 October 2026.
jest.mock('./useToday', () => ({ useToday: () => new Date(2026, 9, 20) }));

const routine = (
  id: string,
  name: string,
  dayPositions: Routine['dayPositions'],
  extra: Partial<Routine> = {},
): Routine => ({
  ...upperBody,
  id,
  name,
  weekdays: Object.keys(dayPositions)
    .map(Number)
    .sort((a, b) => a - b) as Routine['weekdays'],
  dayPositions,
  ...extra,
});

// Tuesday: a morning class, then the upper-body routine. Thursday: rest.
const upper = routine('upper', 'Tren superior 1', { 2: 1, 5: 0 });
const spinning = routine('spinning', 'Spinning', { 2: 0 }, {
  label: 'class',
  plannedDurationS: 2700,
  exercises: [],
});

beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: { user: { id: 'user-1' } }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(fetchRoutines).mockResolvedValue([upper, spinning]);
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<Today />', () => {
  test('shows the date, the week, and one card per routine planned today', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Dimarts, 20 d’octubre')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Dimarts 20, 2 rutines' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Dijous 22, descans' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Divendres 23, 1 rutina' })).toBeOnTheScreen();

    // In their order on the day: the class first, with its duration.
    const cards = screen.getAllByRole('button', { name: /Spinning|Tren superior 1/ });
    expect(cards[0]).toHaveTextContent(/Spinning.*45 min/);
    expect(cards[1]).toHaveTextContent(/Tren superior 1.*4 exercicis · Tracció al pit/);

    await user.press(cards[1]);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/plan/routines/[id]',
      params: { id: 'upper' },
    });
  });

  test('looks at another day of the week, then back to today', async () => {
    const user = userEvent.setup();
    await render(<Today />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('radio', { name: 'Dijous 22, descans' }));
    expect(screen.getByRole('header', { name: 'Dijous, 22 d’octubre' })).toBeOnTheScreen();
    expect(screen.getByText('Dia de descans.')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Avui' }));
    expect(screen.queryByText('Dia de descans.')).not.toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Dimarts 20, 2 rutines' })).toBeChecked();
  });

  test('a rest day today says so', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', { 4: 0 })]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Avui toca descans. Recupera bé!')).toBeOnTheScreen();
  });

  test('with nothing planned all week, points to Pla → Setmana', async () => {
    jest.mocked(fetchRoutines).mockResolvedValue([routine('upper', 'Tren superior 1', {})]);
    await render(<Today />, { wrapper: createAppWrapper() });

    expect(await screen.findByText(/Pla → Setmana/)).toBeOnTheScreen();
  });
});
