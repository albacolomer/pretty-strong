// Units are only for showing and typing: the database keeps kg, cm and
// metres (data rule 6), and these turn one into the other.

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export const LENGTH_UNITS = ['cm', 'in'] as const;
export const DISTANCE_UNITS = ['km', 'mi'] as const;

export type WeightUnit = (typeof WEIGHT_UNITS)[number];
export type LengthUnit = (typeof LENGTH_UNITS)[number];
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export type Units = { weight: WeightUnit; length: LengthUnit; distance: DistanceUnit };

export const METRIC_UNITS: Units = { weight: 'kg', length: 'cm', distance: 'km' };

// Exact, by definition.
const KG_PER_LB = 0.45359237;
const CM_PER_INCH = 2.54;
const METRES_PER_MILE = 1609.344;
const METRES_PER_KM = 1000;

export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

export function fromCm(cm: number, unit: LengthUnit): number {
  return unit === 'cm' ? cm : cm / CM_PER_INCH;
}

export function toCm(value: number, unit: LengthUnit): number {
  return unit === 'cm' ? value : value * CM_PER_INCH;
}

// A distance in km or miles, from the metres it's stored in.
export function fromMetres(metres: number, unit: DistanceUnit): number {
  return metres / (unit === 'km' ? METRES_PER_KM : METRES_PER_MILE);
}

export function toMetres(value: number, unit: DistanceUnit): number {
  return value * (unit === 'km' ? METRES_PER_KM : METRES_PER_MILE);
}

// A speed in km/h or mph, from the km/h it's stored in.
export function fromKmh(kmh: number, unit: DistanceUnit): number {
  return unit === 'km' ? kmh : (kmh * METRES_PER_KM) / METRES_PER_MILE;
}

export function toKmh(value: number, unit: DistanceUnit): number {
  return unit === 'km' ? value : (value * METRES_PER_MILE) / METRES_PER_KM;
}

// A profile's saved text, as a unit; anything unexpected is metric.
export function readUnits(saved: { weight: string; length: string; distance: string }): Units {
  return {
    weight: (WEIGHT_UNITS as readonly string[]).includes(saved.weight)
      ? (saved.weight as WeightUnit)
      : METRIC_UNITS.weight,
    length: (LENGTH_UNITS as readonly string[]).includes(saved.length)
      ? (saved.length as LengthUnit)
      : METRIC_UNITS.length,
    distance: (DISTANCE_UNITS as readonly string[]).includes(saved.distance)
      ? (saved.distance as DistanceUnit)
      : METRIC_UNITS.distance,
  };
}
