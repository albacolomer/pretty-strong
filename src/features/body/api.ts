import { supabase } from '@/lib/supabase';

import type { BodyMeasurement, BodyWeight, MeasurementPart } from './body';

// RLS only returns and changes your own rows.

export async function fetchWeights(): Promise<BodyWeight[]> {
  const { data, error } = await supabase
    .from('body_weights')
    .select('id, date, weight_kg')
    .order('date', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({ id: row.id, date: row.date, weightKg: Number(row.weight_kg) }));
}

// One a day: logging the same day again replaces it.
export async function saveWeight(date: string, weightKg: number): Promise<void> {
  const { error } = await supabase
    .from('body_weights')
    .upsert({ date, weight_kg: weightKg }, { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function deleteWeight(id: string): Promise<void> {
  const { error } = await supabase.from('body_weights').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchMeasurements(): Promise<BodyMeasurement[]> {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('date, part, custom_name, value_cm')
    .order('date', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    date: row.date,
    // The check constraint guarantees the codes.
    part: row.part === 'custom' ? null : (row.part as MeasurementPart),
    customName: row.custom_name,
    valueCm: Number(row.value_cm),
  }));
}

// Several at once (one day's measuring); the same day again replaces them.
export async function saveMeasurements(measurements: readonly BodyMeasurement[]): Promise<void> {
  const { error } = await supabase.from('body_measurements').upsert(
    measurements.map((measurement) => ({
      date: measurement.date,
      part: measurement.part ?? 'custom',
      custom_name: measurement.customName,
      value_cm: measurement.valueCm,
    })),
    { onConflict: 'user_id,part,custom_name,date' },
  );
  if (error) throw error;
}
