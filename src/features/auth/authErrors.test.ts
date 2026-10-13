import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';

import { authErrorReason } from './authErrors';

describe('authErrorReason', () => {
  test('wrong email or password', () => {
    const error = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    expect(authErrorReason(error)).toBe('invalidCredentials');
  });

  test.each(['over_request_rate_limit', 'over_email_send_rate_limit'])('%s → rateLimited', (code) => {
    expect(authErrorReason(new AuthApiError('Too many requests', 429, code))).toBe('rateLimited');
  });

  test('no signal (Supabase wraps the failed request)', () => {
    expect(authErrorReason(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('network');
  });

  test('no signal (raw fetch error from React Native)', () => {
    expect(authErrorReason(new TypeError('Network request failed'))).toBe('network');
  });

  test('anything else', () => {
    expect(authErrorReason(new AuthApiError('Boom', 500, 'unexpected_failure'))).toBe('unknown');
    expect(authErrorReason(new Error('Boom'))).toBe('unknown');
    expect(authErrorReason('not even an error')).toBe('unknown');
  });
});
