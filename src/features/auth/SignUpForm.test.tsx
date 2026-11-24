import '@/lib/i18n';

import { AuthApiError } from '@supabase/supabase-js';
import { render, screen, userEvent } from '@testing-library/react-native';

import { useSetupStore } from '@/features/onboarding/setupStore';

import { isUsernameAvailable, signUp } from './api';
import { SignUpForm } from './SignUpForm';

// Replace the real Supabase calls: tests never touch the network.
jest.mock('./api', () => ({ isUsernameAvailable: jest.fn(), signUp: jest.fn() }));
const mockIsUsernameAvailable = jest.mocked(isUsernameAvailable);
const mockSignUp = jest.mocked(signUp);

beforeEach(() => {
  mockIsUsernameAvailable.mockReset().mockResolvedValue(true);
  mockSignUp.mockReset().mockResolvedValue({ needsEmailConfirmation: false });
  useSetupStore.getState().finish();
});

// The app starts in Catalan, so the tests use the Catalan texts.
async function fillAndSubmit(values: { email?: string; password?: string }) {
  const user = userEvent.setup();
  if (values.email) await user.type(screen.getByLabelText('Correu electrònic'), values.email);
  if (values.password) await user.type(screen.getByLabelText('Contrasenya'), values.password);
  await user.press(screen.getByRole('button', { name: 'Crea el compte' }));
}

const valid = { email: 'alba@gmail.com', password: 'secret123' };

describe('<SignUpForm />', () => {
  test('checks the fields before calling Supabase', async () => {
    await render(<SignUpForm />);

    await fillAndSubmit({ email: 'alba', password: 'short' });

    expect(screen.getByText('Aquest correu no sembla vàlid.')).toBeOnTheScreen();
    expect(screen.getByText('Ha de tenir almenys 8 caràcters.')).toBeOnTheScreen();
    expect(mockIsUsernameAvailable).not.toHaveBeenCalled();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  test('asks only for an email and a password', async () => {
    await render(<SignUpForm />);

    expect(screen.queryByLabelText("Nom d'usuari")).toBeNull();
  });

  test('creates the account with a username made from the email, and the app language', async () => {
    await render(<SignUpForm />);

    await fillAndSubmit({ ...valid, email: 'Alba@gmail.com' });

    expect(mockIsUsernameAvailable).toHaveBeenCalledWith('alba');
    expect(mockSignUp).toHaveBeenCalledWith({
      username: 'alba',
      email: 'Alba@gmail.com',
      password: 'secret123',
      language: 'ca',
    });
  });

  test('adds digits when that username is taken', async () => {
    mockIsUsernameAvailable.mockImplementation((candidate) => Promise.resolve(candidate !== 'alba'));
    await render(<SignUpForm />);

    await fillAndSubmit(valid);

    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ username: expect.stringMatching(/^alba\d{4}$/) }),
    );
  });

  test('leaves the username to the database when none is free', async () => {
    mockIsUsernameAvailable.mockResolvedValue(false);
    await render(<SignUpForm />);

    await fillAndSubmit(valid);

    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({ username: undefined }));
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

  test('has the setup waiting for the new account before it exists', async () => {
    mockSignUp.mockImplementation(async () => {
      // The new session arrives while signUp is still running.
      expect(useSetupStore.getState().pending).toEqual({ email: 'alba@gmail.com', step: 0 });
      return { needsEmailConfirmation: false };
    });
    await render(<SignUpForm />);

    await fillAndSubmit({ ...valid, email: 'Alba@Gmail.com' });

    expect(mockSignUp).toHaveBeenCalled();
    expect(useSetupStore.getState().pending?.email).toBe('alba@gmail.com');
  });

  test('drops the setup when the account could not be made', async () => {
    mockSignUp.mockRejectedValue(new AuthApiError('User already registered', 422, 'user_already_exists'));
    await render(<SignUpForm />);

    await fillAndSubmit(valid);

    expect(await screen.findByText('Ja hi ha un compte amb aquest correu.')).toBeOnTheScreen();
    expect(useSetupStore.getState().pending).toBeNull();
  });
});
