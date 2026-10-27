import type { SFSymbol } from 'expo-symbols';

import type { Weekday } from '@/features/routines/routine';

// Sports in the week (Pla → Setmana): padel, basketball… on a day, with an
// optional time and duration. No React here.

// Matches workout_sessions_sport_check; weekly_sports_sport_check has all
// but RECOVERY_SPORTS.
export const SPORTS = [
  'padel',
  'tennis',
  'football',
  'basketball',
  'volleyball',
  'climbing',
  'hiking',
  'swimming',
  'cycling',
  'yoga',
  'dance',
  'walking',
  'stretching',
  'other',
] as const;
export type Sport = (typeof SPORTS)[number];

// Caminar and Estiraments: logged on Avui (a rest day's quick buttons, or
// +), never planned in the week, and activity rather than workouts.
export const RECOVERY_SPORTS: readonly Sport[] = ['walking', 'stretching'];

// The ones Pla → Setmana offers.
export const PLANNABLE_SPORTS = SPORTS.filter((sport) => !RECOVERY_SPORTS.includes(sport));

// Whether a session counts toward the weekly goal, the streak and the
// workout totals: everything but a walk or stretching.
export function countsAsWorkout(session: { sport: Sport | null }): boolean {
  return session.sport === null || !RECOVERY_SPORTS.includes(session.sport);
}

// Each sport's icon (SF Symbols, iOS's own).
export const SPORT_ICONS: Record<Sport, SFSymbol> = {
  padel: 'tennis.racket',
  tennis: 'figure.tennis',
  football: 'soccerball',
  basketball: 'basketball',
  volleyball: 'volleyball',
  climbing: 'figure.climbing',
  hiking: 'figure.hiking',
  swimming: 'figure.pool.swim',
  cycling: 'bicycle',
  yoga: 'figure.yoga',
  dance: 'figure.dance',
  walking: 'figure.walk',
  stretching: 'figure.flexibility',
  other: 'plus',
};

// "Altres" with a name of your own (weekly_sports_custom_name_check).
export const SPORT_NAME_MAX_LENGTH = 40;

export type WeeklySport = {
  id: string;
  weekday: Weekday;
  sport: Sport;
  // For "Altres".
  customName: string | null;
  // "19:00"; null if not said.
  startTime: string | null;
  durationS: number | null;
  // Its place on the day, among its routines and sports.
  position: number;
};

// A time typed on the number keypad, as it's being typed: "193" → "19:3".
export function formatTimeTyping(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

// A typed time → "19:30"; "7" or "730" work too. Null if empty or not a
// time of day.
export function readTime(text: string): string | null {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return null;
  const hours = Number(digits.length <= 2 ? digits : digits.slice(0, -2));
  const minutes = digits.length <= 2 ? 0 : Number(digits.slice(-2));
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
