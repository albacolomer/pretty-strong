import type { SFSymbol } from 'expo-symbols';

import type { Weekday } from '@/features/routines/routine';

// Sports in the week (Pla → Setmana): padel, basketball… on a day, with an
// optional time and duration. No React here.

// Matches weekly_sports_sport_check and workout_sessions_sport_check.
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
  'other',
] as const;
export type Sport = (typeof SPORTS)[number];

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
