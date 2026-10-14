import { isAuthRetryableFetchError } from '@supabase/supabase-js';

// No signal, or the request timed out. Auth calls wrap this in their own
// error class; database calls return an object whose message is the
// original "TypeError: Network request failed".
export function isNetworkError(error: unknown): boolean {
  if (isAuthRetryableFetchError(error)) return true;
  const message =
    typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  return /network request failed|failed to fetch/i.test(message);
}

// The Postgres error code of a failed database call, e.g. '23505' for a
// duplicate value in a unique column.
export function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return typeof error.code === 'string' ? error.code : undefined;
  }
  return undefined;
}
