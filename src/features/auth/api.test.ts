import { supabase } from '@/lib/supabase';

import { signUp } from './api';
import { authErrorReason } from './authErrors';

// Only the Supabase call is faked; signUp()'s own logic runs for real.
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signUp: jest.fn() } } }));
const mockSupabaseSignUp = jest.mocked(supabase.auth.signUp);

const input = {
  username: 'alba',
  email: ' alba@gmail.com ',
  password: 'secret123',
  language: 'ca' as const,
};
const identity = { id: 'identity-1' };

// signUp's return type is long; tests only fill the fields signUp() reads.
function supabaseReturns(data: { user: unknown; session: unknown }) {
  mockSupabaseSignUp.mockResolvedValue({ data, error: null } as never);
}

describe('signUp', () => {
  test('sends the trimmed email and the profile metadata', async () => {
    supabaseReturns({ user: { identities: [identity] }, session: {} });

    await signUp(input);

    expect(mockSupabaseSignUp).toHaveBeenCalledWith({
      email: 'alba@gmail.com',
      password: 'secret123',
      options: { data: { username: 'alba', language: 'ca' } },
    });
  });

  test('signed in straight away when confirmation is off', async () => {
    supabaseReturns({ user: { identities: [identity] }, session: {} });

    await expect(signUp(input)).resolves.toEqual({ needsEmailConfirmation: false });
  });

  test('needs the email confirmed when there is a new user but no session', async () => {
    supabaseReturns({ user: { identities: [identity] }, session: null });

    await expect(signUp(input)).resolves.toEqual({ needsEmailConfirmation: true });
  });

  test('reports an existing email that Supabase hid behind a fake user', async () => {
    supabaseReturns({ user: { identities: [] }, session: null });

    const error = await signUp(input).catch((e: unknown) => e);

    expect(authErrorReason(error)).toBe('emailTaken');
  });
});
