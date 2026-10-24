import { addDays, dateKey } from '@/features/schedule/dates';

// Profile → Body (US-28): body weight and measurements. Changes are worked
// out from what was logged, never stored (data rule 2). No React here.

export type BodyWeight = { id: string; date: string; weightKg: number };

// The usual measurements, always shown; any other has a name of your own.
export const MEASUREMENT_PARTS = ['waist', 'hips', 'chest', 'arm', 'thigh'] as const;
export type MeasurementPart = (typeof MEASUREMENT_PARTS)[number];

export type BodyMeasurement = {
  date: string;
  // Null for one of your own, with `customName`.
  part: MeasurementPart | null;
  customName: string | null;
  valueCm: number;
};

// What a measurement is, whatever the day: "waist", or "custom:Bíceps".
export function measurementKey(measurement: Pick<BodyMeasurement, 'part' | 'customName'>): string {
  return measurement.part ?? `custom:${measurement.customName}`;
}

export const WEIGHT_RANGES = ['1m', '3m', '6m', '1y'] as const;
export type WeightRange = (typeof WEIGHT_RANGES)[number];

const RANGE_DAYS: Record<WeightRange, number> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 };

// The range's first day, "2026-07-25" for 3 months before 24 October.
export function rangeStart(range: WeightRange, today: Date): string {
  return dateKey(addDays(today, -RANGE_DAYS[range]));
}

// The weights in the range, oldest first.
export function weightsInRange(
  weights: readonly BodyWeight[],
  range: WeightRange,
  today: Date,
): BodyWeight[] {
  const start = rangeStart(range, today);
  return weights
    .filter((weight) => weight.date >= start && weight.date <= dateKey(today))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// The latest weight against the first one in the range; null with fewer
// than two.
export function weightChange(inRange: readonly BodyWeight[]): number | null {
  if (inRange.length < 2) return null;
  return Math.round((inRange.at(-1)!.weightKg - inRange[0].weightKg) * 100) / 100;
}

export type MeasurementSummary = {
  key: string;
  part: MeasurementPart | null;
  customName: string | null;
  // The latest value and when; null if never measured.
  valueCm: number | null;
  date: string | null;
  // Against the one before it.
  changeCm: number | null;
};

// Each measurement's latest value and its change: the usual five first,
// in order (measured or not), then your own by name.
export function latestMeasurements(measurements: readonly BodyMeasurement[]): MeasurementSummary[] {
  const byKey = new Map<string, BodyMeasurement[]>();
  for (const measurement of [...measurements].sort((a, b) => b.date.localeCompare(a.date))) {
    const key = measurementKey(measurement);
    byKey.set(key, [...(byKey.get(key) ?? []), measurement]);
  }
  const summary = (
    key: string,
    part: MeasurementPart | null,
    customName: string | null,
  ): MeasurementSummary => {
    const [latest, previous] = byKey.get(key) ?? [];
    return {
      key,
      part,
      customName,
      valueCm: latest?.valueCm ?? null,
      date: latest?.date ?? null,
      changeCm: latest && previous ? Math.round((latest.valueCm - previous.valueCm) * 10) / 10 : null,
    };
  };
  const custom = [...byKey.values()]
    .map((list) => list[0])
    .filter((measurement) => measurement.part === null)
    .sort((a, b) => (a.customName ?? '').localeCompare(b.customName ?? ''));
  return [
    ...MEASUREMENT_PARTS.map((part) => summary(part, part, null)),
    ...custom.map((measurement) =>
      summary(measurementKey(measurement), null, measurement.customName),
    ),
  ];
}

// The latest day anything was measured, and the day before that: "updated
// 2 Oct · change since 2 Sep".
export function measurementDays(measurements: readonly BodyMeasurement[]): {
  latest: string | null;
  previous: string | null;
} {
  const days = [...new Set(measurements.map((measurement) => measurement.date))].sort().reverse();
  return { latest: days[0] ?? null, previous: days[1] ?? null };
}

// The limits the database allows (body_weights_weight_check,
// body_measurements_value_check).
export const WEIGHT_KG = { min: 20, max: 400 } as const;
export const MEASUREMENT_CM = { min: 1, max: 300 } as const;

// Typed text → a number with one decimal, either separator; null when
// empty, unreadable or outside the limits.
export function readDecimal(text: string, limits: { min: number; max: number }): number | null {
  const value = Number(text.trim().replace(',', '.'));
  if (text.trim() === '' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  return rounded >= limits.min && rounded <= limits.max ? rounded : null;
}
