import '@/lib/i18n';

import { AuthApiError } from '@supabase/supabase-js';
import { render, screen, userEvent } from '@testing-library/react-native';

import { isUsernameAvailable, signUp } from './api';
import { SignUpForm } from './SignUpForm';

// Replace the real Supabase calls: tests never touch the network.
jest.mock('./api', () => ({ isUsernameAvailable: jest.fn(), signUp: jest.fn() }));
const mockIsUsernameAvailable = jest.mocked(isUsernameAvailable);
const mockSignUp = jest.mocked(signUp);

beforeEach(() => {
  mockIsUsernameAvailable.mockReset().mockResolvedValue(true);
  mockSignUp.mockReset().mockResolvedValue({ needsEmailConfirmation: false });
});

// The app starts in Catalan, so the tests use the Catalan texts.
async function fillAndSubmit(values: { username?: string; email?: string; password?: string }) {
  const user = userEvent.setup();
  if (values.username) await user.type(screen.getByLabelText("Nom d'usuari"), values.username);
  if (values.email) await user.type(screen.getByLabelText('Correu electrònic'), values.email);
  if (values.password) await user.type(screen.getByLabelText('Contrasenya'), values.password);
  await user.press(screen.getByRole('button', { name: 'Crea el compte' }));
}

const valid = { username: 'Alba', email: 'alba@gmail.com', password: 'secret123' };

describe('<SignUpForm />', () => {
  test('checks the fields before calling Supabase', async () => {
    await render(<SignUpForm />);

    await fillAndSubmit({ username: 'al', email: 'alba', password: 'short' });

    expect(screen.getByText('Fes servir de 3 a 20 minúscules, números o _.')).toBeOnTheScreen();
    expect(screen.getByText('Aquest correu no sembla vàlid.')).toBeOnTheScreen();
    expect(screen.getByText('Ha de tenir almenys 8 caràcters.')).toBeOnTheScreen();
    expect(mockIsUsernameAvailable).not.toHaveBeenCalled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('creates the account with the lowercased username and the app language', async () => {
    await render(<SignUpForm />);

    await fillAndSubmit(valid);

    expect(mockIsUsernameAvailable).toHaveBeenCalledWith('alba');
    expect(mockSignUp).toHaveBeenCalledWith({
      username: 'alba',
      email: 'alba@gmail.com',
      password: 'secret123',
      language: 'ca',
    });
  });

  test('stops when the username is taken', async () => {
    mockIsUsernameAvailable.mockResolvedValue(false);
    await render(<SignUpForm />);

    await fillAndSubmit(valid);

    expect(await screen.findByText("Aquest nom d'usuari ja està agafat.")).toBeOnTheScreen();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('shows an existing email under the email field', async () => {
    mockSignUp.mockRejectedValue(new AuthApiError('User already registered', 422, 'user_already_exists'));
    await render(<SignUpForm />);

    await fillAndSubmit(valid);

    expect(await screen.findByText('Ja hi ha un compte amb aquest correu.')).toBeOnTheScreen();
  });

  test('asks to confirm the email when Supabase requires it', async () => {
    mockSignUp.mockResolvedValue({ needsEmailConfirmation: true });
    await render(<SignUpForm />);

    await fillAndSubmit(valid);

    expect(await screen.findByRole('alert')).toHaveTextContent(/T'hem enviat un correu/);
  });
});
