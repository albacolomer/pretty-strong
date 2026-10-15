import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';

import type { Exercise } from './exercise';
import { ExercisePicker } from './ExercisePicker';
import { useExercises } from './useExercises';

jest.mock('@/features/auth/AuthProvider', () => ({ useAuth: jest.fn() }));
jest.mock('./api', () => ({}));
// Fake only the library data; keep the real query keys.
jest.mock('./useExercises', () => ({
  ...jest.requireActual('./useExercises'),
  useExercises: jest.fn(),
}));

function builtIn(id: string, ca: string): Exercise {
  return {
    id,
    slug: id,
    names: { ca, es: ca, en: ca },
    name: null,
    trackingType: 'weight_reps',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    equipment: 'barbell',
    isUnilateral: false,
  };
}

beforeEach(() => {
  jest.mocked(useExercises).mockReturnValue({
    data: [builtIn('hip_thrust', 'Hip thrust amb barra'), builtIn('back_squat', 'Esquat amb barra')],
    isPending: false,
  } as ReturnType<typeof useExercises>);
});

// The app starts in Catalan, so the tests use the Catalan texts.
describe('<ExercisePicker />', () => {
  test('adds the ticked exercises in the order they were ticked', async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn();
    await render(<ExercisePicker visible onClose={jest.fn()} onAdd={onAdd} />);

    expect(screen.getByRole('button', { name: 'Afegeix (0)' })).toBeDisabled();

    await user.press(screen.getByRole('checkbox', { name: /Esquat amb barra/ }));
    await user.press(screen.getByRole('checkbox', { name: /Hip thrust amb barra/ }));

    expect(screen.getByRole('checkbox', { name: /Esquat amb barra/ })).toBeChecked();
    await user.press(screen.getByRole('button', { name: 'Afegeix (2)' }));

    expect(onAdd).toHaveBeenCalledWith(['back_squat', 'hip_thrust']);
  });

  test('a second tap unticks', async () => {
    const user = userEvent.setup();
    await render(<ExercisePicker visible onClose={jest.fn()} onAdd={jest.fn()} />);
    const squat = screen.getByRole('checkbox', { name: /Esquat amb barra/ });

    await user.press(squat);
    await user.press(squat);

    expect(squat).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Afegeix (0)' })).toBeDisabled();
  });

  test('searches like the library, and can be cancelled', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<ExercisePicker visible onClose={onClose} onAdd={jest.fn()} />);

    await user.type(screen.getByLabelText('Cerca'), 'esquat');

    expect(screen.queryByRole('checkbox', { name: /Hip thrust/ })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Cancel·la' }));
    expect(onClose).toHaveBeenCalled();
  });
});
