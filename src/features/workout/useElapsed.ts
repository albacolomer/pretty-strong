import { useEffect, useState } from 'react';

// "12:34", or "1:02:03" past an hour.
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

// The clock, redrawn every `intervalMs`. Times are always worked out from
// it, never counted, so a locked phone never loses any.
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

// Time since `startedAt`.
export function useElapsed(startedAt: string): string {
  const now = useNow();
  return formatElapsed(now - new Date(startedAt).getTime());
}
