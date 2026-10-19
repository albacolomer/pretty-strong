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

// Time since `startedAt`, worked out from the clock each second (the
// second tick only redraws it, so a locked phone never loses time).
export function useElapsed(startedAt: string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return formatElapsed(now - new Date(startedAt).getTime());
}
