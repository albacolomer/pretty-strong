import '@/lib/i18n';

import { render, screen } from '@testing-library/react-native';

import { fetchHistoryEntries } from '@/features/history/api';
import type { HistoryEntry } from '@/features/history/entries';
import { fetchRoutines } from '@/features/routines/api';
import { upperBody } from '@/features/routines/testData';
import { createAppWrapper } from '@/test-utils/appWrapper';

import { fetchProfile, type Profile } from './api';
import { ProgressTab } from './ProgressTab';

jest.mock('@/features/schedule/sportsApi', () => ({ fetchWeeklySports: jest.fn(() => Promise.resolve([])) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({ fetchProfile: jest.fn() }));
jest.mock('@/features/history/api', () => ({ fetchHistoryEntries: jest.fn() }));
jest.mock('@/features/routines/api', () => ({ fetchRoutines: jest.fn() }));
jest.mock('@/features/workout/api', () => ({ deleteSession: jest.fn() }));
// Today is Wednesday 21 October 2026.
jest.mock('@/features/schedule/useToday', () => ({ useToday: () => new Date(2026, 9, 21) }));

function entry(date: string, values: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: date,
    date,
    routineName: 'Tren superior 1',
    routineId: 'upper',
    routineLabel: 'strength',
    customLabel: null,
    sport: null,
    sportName: null,
    eventKind: null,
    eventName: null,
    logMode: 'live',
    durationS: 3600,
    exercises: 4,
    sets: 14,
    volumeKg: 5000,
    distanceM: 0,
    runDistanceM: 0,
    pace: null,
    pending: false,
    ...values,
  };
}

beforeEach(() => {
  jest.mocked(fetchProfile).mockResolvedValue({ weekly_goal: 4 } as Profile);
  jest.mocked(fetchRoutines).mockResolvedValue([upperBody]);
  jest.mocked(fetchHistoryEntries).mockResolvedValue([
    // This week: 3.
    entry('2026-10-21'),
    entry('2026-10-20', { routineLabel: 'hybrid', volumeKg: 0 }),
    entry('2026-10-19', { routineLabel: 'run', volumeKg: 0, durationS: 3000, runDistanceM: 10100 }),
    // Last week: 4.
    entry('2026-10-16'),
    entry('2026-10-14'),
    entry('2026-10-13'),
    entry('2026-10-12'),
    // September, the same days: 1st to 21st.
    entry('2026-09-15', { durationS: 7200, volumeKg: 30000, runDistanceM: 5000 }),
    entry('2026-09-28'),
  ]);
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ProgressTab />', () => {
  test('workouts per week against the goal', async () => {
    await render(<ProgressTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('Entrenaments per setmana')).toBeOnTheScreen();
    expect(
      await screen.findByLabelText(
        // Weeks of 14 Sep (the 15th), 21 Sep, 28 Sep, 5, 12 and 19 Oct.
        'Entrenaments per setmana: 1, 0, 1, 0, 4, i 3 aquesta setmana. Objectiu 4',
      ),
    ).toBeOnTheScreen();
  });

  test('this month so far against the same days of last month', async () => {
    await render(<ProgressTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByRole('header', { name: 'Octubre fins ara' })).toBeOnTheScreen();
    expect(screen.getByText('vs 1–21 de setembre')).toBeOnTheScreen();
    // 7 workouts: 6 h 50 min; September: 2 h.
    expect(screen.getByLabelText('Temps: 6 h 50 min: ↑ 4 h 50 min')).toBeOnTheScreen();
    // 5 × 5 t = 25 t; September: 30 t.
    expect(screen.getByLabelText('Volum: 25 t: ↓ 5 t')).toBeOnTheScreen();
    expect(screen.getByLabelText('Córrer: 10,1 km: ↑ 5,1 km')).toBeOnTheScreen();
    // 410 min / 7 ≈ 59 min; September 2 h: not coloured, still shown.
    expect(screen.getByLabelText('Sessió mitjana: 59 min: ↓ 1 h 1 min')).toBeOnTheScreen();
  });

  test('the training mix, by routine type', async () => {
    await render(<ProgressTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByText('7 aquest mes')).toBeOnTheScreen();
    expect(screen.getByLabelText('Força: 5')).toBeOnTheScreen();
    expect(screen.getByLabelText('Híbrid: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Córrer: 1')).toBeOnTheScreen();
  });
});
