import '@/lib/i18n';

import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import { createAppWrapper } from '@/test-utils/appWrapper';

import {
  deleteWeight,
  fetchMeasurements,
  fetchWeights,
  saveMeasurements,
  saveWeight,
} from './api';
import { BodyTab } from './BodyTab';
import { WeightHistory } from './WeightHistory';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } }, isLoading: false }),
}));
jest.mock('./api', () => ({
  fetchWeights: jest.fn(),
  saveWeight: jest.fn(() => Promise.resolve()),
  deleteWeight: jest.fn(() => Promise.resolve()),
  fetchMeasurements: jest.fn(),
  saveMeasurements: jest.fn(() => Promise.resolve()),
}));
// Today is Saturday 24 October 2026.
jest.mock('@/features/schedule/useToday', () => ({ useToday: () => new Date(2026, 9, 24) }));

beforeEach(() => {
  jest.mocked(fetchWeights).mockResolvedValue([
    { id: 'w-3', date: '2026-10-24', weightKg: 61.4 },
    { id: 'w-2', date: '2026-10-10', weightKg: 61.8 },
    { id: 'w-1', date: '2026-08-01', weightKg: 62.9 },
  ]);
  jest.mocked(fetchMeasurements).mockResolvedValue([
    { date: '2026-10-02', part: 'waist', customName: null, valueCm: 68 },
    { date: '2026-10-02', part: null, customName: 'Bíceps', valueCm: 31 },
    { date: '2026-09-02', part: 'waist', customName: null, valueCm: 69 },
  ]);
  jest.mocked(saveWeight).mockClear();
  jest.mocked(saveMeasurements).mockClear();
  jest.mocked(deleteWeight).mockClear();
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('Body (US-28)', () => {
  test('the latest weight and its change over the range, with the chart', async () => {
    const user = userEvent.setup();
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByLabelText('61,4 kg')).toBeOnTheScreen();
    expect(screen.getByText('−1,5 kg en 3 mesos · registrat avui')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pes de 62,9 a 61,4 kg.')).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: '1M' }));
    expect(screen.getByText('−0,4 kg en 1 mes · registrat avui')).toBeOnTheScreen();
  });

  test('+ Registra el pes saves today’s weight', async () => {
    const user = userEvent.setup();
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: '+ Registra el pes' }));
    const field = screen.getByLabelText('Pes (kg)');
    expect(field.props.placeholder).toBe('61,4');
    await user.type(field, '60,8');
    await user.press(screen.getByRole('button', { name: 'Desa' }));

    await waitFor(() => expect(saveWeight).toHaveBeenCalledWith('2026-10-24', 60.8));
  });

  test('measurements: the latest of each, with the change since the time before', async () => {
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    expect(await screen.findByLabelText('Cintura, 68,0 cm, −1,0')).toBeOnTheScreen();
    expect(screen.getByLabelText('Pit, –')).toBeOnTheScreen();
    expect(screen.getByLabelText('Bíceps, 31,0 cm')).toBeOnTheScreen();
    expect(screen.getByText('Actualitzat el 2 d’oct. · canvi des del 2 de set.')).toBeOnTheScreen();
  });

  test('Edita saves the ones typed; + Afegeix one of your own', async () => {
    const user = userEvent.setup();
    await render(<BodyTab />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: 'Edita' }));
    expect(screen.getByLabelText('Cintura (cm)').props.placeholder).toBe('68');
    await user.type(screen.getByLabelText('Cintura (cm)'), '67,5');
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(saveMeasurements).toHaveBeenCalledWith([
        { date: '2026-10-24', part: 'waist', customName: null, valueCm: 67.5 },
      ]),
    );

    await user.press(screen.getByRole('button', { name: '+ Afegeix' }));
    await user.type(screen.getByLabelText('Nom'), 'Bessó');
    await user.type(screen.getByLabelText('Bessó (cm)'), '35');
    await user.press(screen.getByRole('button', { name: 'Desa' }));
    await waitFor(() =>
      expect(saveMeasurements).toHaveBeenLastCalledWith([
        { date: '2026-10-24', part: null, customName: 'Bessó', valueCm: 35 },
      ]),
    );
  });

  test('the weight history: deleting one goes at once, with Desfés', async () => {
    const user = userEvent.setup();
    const actionSheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => callback(0));
    await render(<WeightHistory />, { wrapper: createAppWrapper() });

    await user.press(await screen.findByRole('button', { name: '61,8 kg, ds., 10 d’oct.' }));
    await waitFor(() => expect(deleteWeight).toHaveBeenCalledWith('w-2'));
    await user.press(await screen.findByRole('button', { name: 'Desfés' }));
    await waitFor(() => expect(saveWeight).toHaveBeenCalledWith('2026-10-10', 61.8));
    actionSheet.mockRestore();
  });
});
