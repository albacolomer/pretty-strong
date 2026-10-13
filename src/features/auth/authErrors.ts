import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

// Each reason is also the last part of its translation key: auth.errors.<reason>.
export type AuthErrorReason = 'invalidCredentials' | 'rateLimited' | 'network' | 'unknown';

// Turns whatever Supabase threw into a reason we can show to the user.
export function authErrorReason(error: unknown): AuthErrorReason {
  // No signal, or the request timed out.
  if (isAuthRetryableFetchError(error)) return 'network';
  if (error instanceof TypeError && /network/i.test(error.message)) return 'network';

  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'invalidCredentials';
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return 'rateLimited';
    }
  }

  return 'unknown';
}
