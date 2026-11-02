import { supabase } from '@/lib/supabase';

import type { CalendarEvent, EventKind } from './events';

// Your competitions and special dates (see events). RLS only returns and
// changes your own rows.

// All of them, by date: a handful a year, so loaded at once and shared by
// the calendar and Avui.
export async function fetchEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, date, kind, name, place, notes')
    .order('date')
    .order('created_at');
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    date: row.date,
    // The database's check constraint guarantees the code.
    kind: row.kind as EventKind,
    name: row.name,
    place: row.place,
    notes: row.notes,
  }));
}

// Adds it or changes it. The id is made on the phone, so "Desfés" after
// deleting saves the very same event back.
export async function saveEvent(event: CalendarEvent): Promise<void> {
  const { error } = await supabase.from('events').upsert({
    id: event.id,
    date: event.date,
    kind: event.kind,
    name: event.name,
    place: event.place,
    notes: event.notes,
  });
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
