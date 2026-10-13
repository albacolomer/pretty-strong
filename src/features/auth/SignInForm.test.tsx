import '@/lib/i18n';

import { AuthApiError } from '@supabase/supabase-js';
import { render, screen, userEvent } from '@testing-library/react-native';

import { signIn } from './api';
import { SignInForm } from './SignInForm';

// Replace the real Supabase calls: tests never touch the network.
jest.mock('./api', () => ({ signIn: jest.fn() }));
const mockSignIn = jest.mocked(signIn);

beforeEach(() => {
  mockSignIn.mockReset();
});

// The app starts in Catalan, so the tests use the Catalan texts.
async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('Correu electrònic'), email);
  if (password) await user.type(screen.getByLabelText('Contrasenya'), password);
  await user.press(screen.getByRole('button', { name: 'Entra' }));
}

describe('<SignInForm />', () => {
  test('shows field errors and does not call Supabase when empty', async () => {
    await render(<SignInForm />);

    await fillAndSubmit('', '');

    expect(screen.getAllByText('Aquest camp és obligatori.')).toHaveLength(2);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  test('signs in with the typed email and password', async () => {
    mockSignIn.mockResolvedValue();
    await render(<SignInForm />);

    await fillAndSubmit('alba@gmail.com', 'secret123');

    expect(mockSignIn).toHaveBeenCalledWith('alba@gmail.com', 'secret123');
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  test('explains a wrong email or password', async () => {
    mockSignIn.mockRejectedValue(
      new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
    );
    await render(<SignInForm />);

    await fillAndSubmit('alba@gmail.com', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correu o la contrasenya no són correctes.',
    );
  });
});
