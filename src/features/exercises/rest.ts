// Default rest between sets, in seconds (stored as default_rest_s).

export const REST_STEP_S = 15;
export const REST_MAX_S = 600;
export const REST_PRESETS_S = [60, 90, 120, 180] as const;
// Used when an exercise has no default rest of its own.
export const APP_DEFAULT_REST_S = 90;

// 90 → "1:30", 45 → "0:45", 600 → "10:00".
export function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

// ±15 s from the current value (or the app default when there is none),
// kept on the 15-second grid and between 0 and 10 minutes.
export function adjustRest(current: number | null, delta: number): number {
  const base = current ?? APP_DEFAULT_REST_S;
  const stepped = Math.round((base + delta) / REST_STEP_S) * REST_STEP_S;
  return Math.min(REST_MAX_S, Math.max(0, stepped));
}
