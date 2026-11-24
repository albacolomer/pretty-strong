import type { Sport } from './sports';

// Something added to one week only (US-29, "+ Afegeix" while planning the
// next week): a routine or a sport on a real date, on top of the usual
// week (see schedule_additions). No React here.
export type Addition = {
  // Made on the phone, so "Desfés" puts back the very same one.
  id: string;
  // "2026-11-30".
  date: string;
  // A routine, or else a sport.
  routineId: string | null;
  sport: Sport | null;
  // For "Altres".
  customName: string | null;
  // "19:00"; a sport's only.
  startTime: string | null;
  durationS: number | null;
  // Its place on the day, on the same scale as the usual week's.
  position: number;
};

// A sport of the usual week, off one date only (see schedule_sport_drops).
// Moving it or changing its time for that week is a drop plus an addition.
export type SportDrop = { sportId: string; date: string };

// The additions with `id` on `to` at `position`, or without it (null).
export function withAdditionMoved(
  additions: readonly Addition[],
  id: string,
  to: string | null,
  position: number,
): Addition[] {
  return to === null
    ? additions.filter((addition) => addition.id !== id)
    : additions.map((addition) => (addition.id === id ? { ...addition, date: to, position } : addition));
}

// The additions dated from `from` to `to`, both included.
export function additionsBetween(
  additions: readonly Addition[],
  from: string,
  to: string,
): Addition[] {
  return additions.filter((addition) => addition.date >= from && addition.date <= to);
}
