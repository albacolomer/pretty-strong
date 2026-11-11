import type { EventKind } from '@/features/events/events';
import type { Sport } from '@/features/schedule/sports';

// A workout session as the app uses it (workout_sessions). No React here.

// Why a day was skipped or swapped, matching workout_sessions_change_reason_check.
// Each is also the last part of its translation key: workout.reasons.<reason>.
export const CHANGE_REASONS = ['tired', 'unwell', 'no_time', 'other'] as const;
export type ChangeReason = (typeof CHANGE_REASONS)[number];

export type SessionStatus = 'in_progress' | 'completed' | 'skipped';

// "Com t'has sentit?" at the end, 0 (awful) to 10 (amazing), in whole
// steps, matching workout_sessions_feeling_check.
export const FEELING_MIN = 0;
export const FEELING_MAX = 10;
export type Feeling = number;

// The word under the number: two steps to each, 10 on its own.
export const FEELING_MOODS = ['awful', 'bad', 'okay', 'good', 'great', 'amazing'] as const;
export type FeelingMood = (typeof FEELING_MOODS)[number];

export function feelingMood(feeling: Feeling): FeelingMood {
  const step = Math.min(Math.max(Math.round(feeling), FEELING_MIN), FEELING_MAX);
  return FEELING_MOODS[Math.floor(step / 2)];
}

// A workout finished before "Com t'has sentit?" kept energy 1 to 5; it's
// doubled, as the database did with the saved ones.
export function feelingFromEnergy(energy: number): Feeling {
  return energy * 2;
}

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
  // When a live workout began (ISO); unknown for a quick log, and left out
  // where it isn't needed.
  startedAt?: string | null;
  notes: string | null;
  changeReason: ChangeReason | null;
  // A sport's session: the planned sport it was for, and which sport (with
  // its own name for "Altres"), kept even if the plan changes.
  plannedSportId: string | null;
  sport: Sport | null;
  sportName: string | null;
  // A competition or special date's session (US-30): the event it was for,
  // and its kind and name (null: the kind's), kept even if the event
  // changes or goes.
  plannedEventId: string | null;
  eventKind: EventKind | null;
  eventName: string | null;
};

// For a session that isn't an event's.
export const NO_EVENT = { plannedEventId: null, eventKind: null, eventName: null } as const;

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
