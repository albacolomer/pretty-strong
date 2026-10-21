// A workout session as the app uses it (workout_sessions). No React here.

// Why a day was skipped or swapped, matching workout_sessions_change_reason_check.
// Each is also the last part of its translation key: workout.reasons.<reason>.
export const CHANGE_REASONS = ['tired', 'unwell', 'no_time', 'other'] as const;
export type ChangeReason = (typeof CHANGE_REASONS)[number];

export type SessionStatus = 'in_progress' | 'completed' | 'skipped';

// How much energy was left at the end, 1 (none) to 5 (plenty), matching
// workout_sessions_energy_check.
export const ENERGY_LEVELS = [1, 2, 3, 4, 5] as const;
export type Energy = (typeof ENERGY_LEVELS)[number];

// Matches workout_sessions_notes_length.
export const SESSION_NOTES_MAX_LENGTH = 1000;

export type WorkoutSession = {
  id: string;
  // "2026-10-20", the calendar day it belongs to.
  date: string;
  // What the week planned, and what was done (they differ after a swap;
  // empty for a skipped day).
  plannedRoutineId: string | null;
  routineId: string | null;
  status: SessionStatus;
  logMode: 'live' | 'quick';
  // A quick log's length, when given.
  durationS: number | null;
  notes: string | null;
  changeReason: ChangeReason | null;
};

// A quick log's length: from 1 minute to 24 hours, as the database allows.
export const QUICK_DURATION_MAX_MIN = 24 * 60;

// Whole minutes typed → seconds; empty or 0 means no duration.
export function readMinutes(text: string): number | null {
  const minutes = Number.parseInt(text.replace(/\D/g, ''), 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return Math.min(QUICK_DURATION_MAX_MIN, minutes) * 60;
}

// A live workout's length, from its real start and end times.
export function liveDuration(startedAt: string | null, endedAt: string | null): number | null {
  if (!startedAt || !endedAt) return null;
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

// Why an exercise was swapped or skipped mid-workout, matching
// session_exercises_change_reason_check (spec: ReasonChips). Each is also
// the last part of its translation key: workout.exerciseReasons.<reason>.
export const EXERCISE_CHANGE_REASONS = ['machine_busy', 'pain', 'tired', 'no_time', 'other'] as const;
export type ExerciseChangeReason = (typeof EXERCISE_CHANGE_REASONS)[number];
