// The rest timer (US-17, spec: "Rest timer"). It keeps the moment rest
// ends, not a counter: the countdown is worked out from that moment, so a
// locked phone or a closed app never loses time, and a notification is
// scheduled for the same moment. Plain data, saved with the workout. No
// React here.

// The set that comes after the rest.
export type NextSet = {
  exerciseId: string;
  setId: string;
};

export type RestTimer = {
  // Its own id, so a notification scheduled for an older rest can't be
  // mistaken for this one's.
  id: string;
  // How long it was set for, for the bar's progress.
  totalS: number;
  // While running: when it ends (ISO). Null while paused.
  endsAt: string | null;
  // While paused: what was left. Null while running.
  pausedRemainingMs: number | null;
  next: NextSet | null;
  // The scheduled "rest is over" notification, once it's scheduled.
  notificationId: string | null;
};

export const REST_ADJUST_S = 15;

export function startRest(id: string, seconds: number, now: number, next: NextSet | null): RestTimer {
  return {
    id,
    totalS: seconds,
    endsAt: new Date(now + seconds * 1000).toISOString(),
    pausedRemainingMs: null,
    next,
    notificationId: null,
  };
}

// What's left, never below 0.
export function remainingMs(timer: RestTimer, now: number): number {
  if (timer.endsAt === null) return timer.pausedRemainingMs ?? 0;
  return Math.max(0, new Date(timer.endsAt).getTime() - now);
}

export function isPaused(timer: RestTimer): boolean {
  return timer.endsAt === null;
}

export function pauseRest(timer: RestTimer, now: number): RestTimer {
  if (isPaused(timer)) return timer;
  return { ...timer, endsAt: null, pausedRemainingMs: remainingMs(timer, now), notificationId: null };
}

export function resumeRest(timer: RestTimer, now: number): RestTimer {
  if (!isPaused(timer)) return timer;
  return {
    ...timer,
    endsAt: new Date(now + (timer.pausedRemainingMs ?? 0)).toISOString(),
    pausedRemainingMs: null,
  };
}

// ±15 s: what's left changes (never below 0), and so does the total, so
// the progress bar stays right.
export function adjustRest(timer: RestTimer, deltaS: number, now: number): RestTimer {
  const left = Math.max(0, remainingMs(timer, now) + deltaS * 1000);
  const totalS = Math.max(0, timer.totalS + deltaS);
  return isPaused(timer)
    ? { ...timer, totalS, pausedRemainingMs: left }
    : { ...timer, totalS, endsAt: new Date(now + left).toISOString(), notificationId: null };
}

// "1:23".
export function formatCountdown(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
