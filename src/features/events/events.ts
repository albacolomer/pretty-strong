import type { IconName } from '@/components/ui';

import { dayNumber, fromDateKey } from '@/features/schedule/dates';

// Competitions and special dates (US-30): a marathon, a HYROX… on a day of
// the calendar. No React here.

// Matches events_kind_check.
export const EVENT_KINDS = [
  'marathon',
  'half_marathon',
  'race',
  'trail',
  'hyrox',
  'spartan',
  'triathlon',
  'other',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

// Each kind's icon (see components/ui/Icon).
export const EVENT_ICONS: Record<EventKind, IconName> = {
  marathon: 'figure.run',
  half_marathon: 'figure.run.circle',
  race: 'flag.checkered',
  trail: 'mountain.2',
  hyrox: 'figure.strengthtraining.functional',
  spartan: 'figure.climbing',
  triathlon: 'figure.open.water.swim',
  other: 'star',
};

// events_name_check and events_place_check.
export const EVENT_NAME_MAX_LENGTH = 60;
export const EVENT_PLACE_MAX_LENGTH = 60;
// events_notes_check.
export const EVENT_NOTES_MAX_LENGTH = 500;

export type CalendarEvent = {
  id: string;
  // "2026-11-14".
  date: string;
  kind: EventKind;
  // Null: the kind's name is shown. "Altres" always has one.
  name: string | null;
  place: string | null;
  notes: string | null;
};

// What the event sheet edits, as typed.
export type EventDraft = {
  date: string;
  kind: EventKind | null;
  name: string;
  place: string;
  notes: string;
};

export function draftFrom(event: CalendarEvent): EventDraft {
  return {
    date: event.date,
    kind: event.kind,
    name: event.name ?? '',
    place: event.place ?? '',
    notes: event.notes ?? '',
  };
}

export function emptyDraft(date: string): EventDraft {
  return { date, kind: null, name: '', place: '', notes: '' };
}

// Ready to save: a kind, and a name for "Altres".
export function isDraftReady(draft: EventDraft): boolean {
  return draft.kind !== null && (draft.kind !== 'other' || draft.name.trim() !== '');
}

// The event to save, with empty text as null. Null while not ready.
export function eventFromDraft(draft: EventDraft, id: string): CalendarEvent | null {
  if (!isDraftReady(draft) || draft.kind === null) return null;
  const text = (value: string) => value.trim() || null;
  return {
    id,
    date: draft.date,
    kind: draft.kind,
    name: text(draft.name),
    place: text(draft.place),
    notes: text(draft.notes),
  };
}

// The day's events, in the order they were added.
export function eventsOn(events: readonly CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((event) => event.date === date);
}

// The days with at least one event.
export function eventDays(events: readonly CalendarEvent[]): Set<string> {
  return new Set(events.map((event) => event.date));
}

// Avui's countdown: the nearest event from `from` on ("2026-11-03", that
// day's too). Of two on that day, the one added first. Null when none is
// ahead.
export function nextEvent(events: readonly CalendarEvent[], from: string): CalendarEvent | null {
  let next: CalendarEvent | null = null;
  for (const event of events) {
    if (event.date >= from && (next === null || event.date < next.date)) next = event;
  }
  return next;
}

// Whole calendar days from `today` to `date` ("2026-11-14"): 0 on the day,
// 1 the day before. Counted by calendar day, so a clock change doesn't
// shift it.
export function daysUntil(today: string, date: string): number {
  return dayNumber(fromDateKey(date)) - dayNumber(fromDateKey(today));
}
