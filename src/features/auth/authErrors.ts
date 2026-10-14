import { isAuthError } from '@supabase/supabase-js';

import { isNetworkError } from '@/lib/errors';

// Each reason is also the last part of its translation key: auth.errors.<reason>.
export type AuthErrorReason =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'weakPassword'
  | 'rateLimited'
  | 'network'
  | 'unknown';

// Turns whatever Supabase threw into a reason we can show to the user.
export function authErrorReason(error: unknown): AuthErrorReason {
  if (isNetworkError(error)) return 'network';

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
