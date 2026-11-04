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

// What a measurement key stands for: "waist" is the waist, "custom:Bíceps"
// one of your own.
export function parseMeasurementKey(
  key: string,
): Pick<BodyMeasurement, 'part' | 'customName'> {
  const part = MEASUREMENT_PARTS.find((usual) => usual === key);
  return part
    ? { part, customName: null }
    : { part: null, customName: key.replace(/^custom:/, '') };
}

// The periods a weight or measurement chart can show.
export const BODY_RANGES = ['1m', '3m', '6m', '1y'] as const;
export type BodyRange = (typeof BODY_RANGES)[number];

const RANGE_DAYS: Record<BodyRange, number> = { '1m': 30, '3m': 91, '6m': 182, '1y': 365 };

// The range's first day, "2026-07-25" for 3 months before 24 October.
export function rangeStart(range: BodyRange, today: Date): string {
  return dateKey(addDays(today, -RANGE_DAYS[range]));
}

// The weights or measurements in the range, oldest first.
export function inRange<T extends { date: string }>(
  items: readonly T[],
  range: BodyRange,
  today: Date,
): T[] {
  const start = rangeStart(range, today);
  return items
    .filter((item) => item.date >= start && item.date <= dateKey(today))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// The last value against the first, oldest first; null with fewer than two.
export function changeOver(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  return Math.round((values.at(-1)! - values[0]) * 100) / 100;
}

// "−1,5" and "+0,5": a change with its sign.
export function formatSigned(value: number, language: string, digits: number): string {
  const number = new Intl.NumberFormat(language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value));
  return `${value < 0 ? '−' : value > 0 ? '+' : ''}${number}`;
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

// Every time one measurement was taken ("waist", "custom:Bíceps"), newest
// first.
export function measurementHistory(
  measurements: readonly BodyMeasurement[],
  key: string,
): BodyMeasurement[] {
  return measurements
    .filter((measurement) => measurementKey(measurement) === key)
    .sort((a, b) => b.date.localeCompare(a.date));
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
