import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

// Each reason is also the last part of its translation key: auth.errors.<reason>.
export type AuthErrorReason =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'weakPassword'
  | 'rateLimited'
  | 'network'
  | 'unknown';

// No signal, or the request timed out. Auth calls wrap this in their own
// error class; database calls return an object whose message is the
// original "TypeError: Network request failed".
function isNetworkFailure(error: unknown): boolean {
  if (isAuthRetryableFetchError(error)) return true;
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  return /network request failed|failed to fetch/i.test(message);
}

// Turns whatever Supabase threw into a reason we can show to the user.
export function authErrorReason(error: unknown): AuthErrorReason {
  if (isNetworkFailure(error)) return 'network';

  if (isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'invalidCredentials';
      case 'email_exists':
      case 'user_already_exists':
        return 'emailTaken';
      case 'weak_password':
        return 'weakPassword';
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return 'rateLimited';
    }
  }

  return 'unknown';
}
