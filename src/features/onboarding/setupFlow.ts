import { MEASUREMENT_CM, WEIGHT_KG } from '@/features/body/body';
import { fromCm, fromKg, toCm, toKg, type LengthUnit, type WeightUnit } from '@/lib/units';

// The setup after sign-up (US-01): a few questions, each one skippable,
// then "Tot a punt". No React here.

export const SETUP_STEPS = [
  'name',
  'about',
  'units',
  'weight',
  'measurements',
  'goals',
  'ready',
] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

// The questions, counted for "Pas 2 de 6"; the last screen isn't one.
export const SETUP_QUESTIONS = SETUP_STEPS.length - 1;

// How full the bar at the top is on a step: a sixth on the first question,
// full on the last one.
export function setupProgress(index: number): number {
  return Math.min(Math.max(index + 1, 0) / SETUP_QUESTIONS, 1);
}

// What was typed in a number field: nothing, something the database
// wouldn't take, or a value in kg or cm.
export type Reading = { status: 'empty' } | { status: 'invalid' } | { status: 'ok'; value: number };

// Typed in your unit, kept in kg or cm with one decimal (data rule 6).
function read(
  text: string,
  toBase: (value: number) => number,
  limits: { min: number; max: number },
): Reading {
  const trimmed = text.trim();
  if (trimmed === '') return { status: 'empty' };
  const typed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(typed)) return { status: 'invalid' };
  const value = Math.round(toBase(typed) * 10) / 10;
  return value >= limits.min && value <= limits.max
    ? { status: 'ok', value }
    : { status: 'invalid' };
}

export function readWeight(text: string, unit: WeightUnit): Reading {
  return read(text, (value) => toKg(value, unit), WEIGHT_KG);
}

export function readLength(text: string, unit: LengthUnit): Reading {
  return read(text, (value) => toCm(value, unit), MEASUREMENT_CM);
}

// The database's limits in your unit, whole numbers inside them, for
// "Escriu un pes entre 45 i 881 lb".
export function weightLimits(unit: WeightUnit): { min: number; max: number } {
  return {
    min: Math.ceil(fromKg(WEIGHT_KG.min, unit)),
    max: Math.floor(fromKg(WEIGHT_KG.max, unit)),
  };
}

export function lengthLimits(unit: LengthUnit): { min: number; max: number } {
  return {
    min: Math.ceil(fromCm(MEASUREMENT_CM.min, unit)),
    max: Math.floor(fromCm(MEASUREMENT_CM.max, unit)),
  };
}
