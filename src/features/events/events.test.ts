import {
  draftFrom,
  emptyDraft,
  eventDays,
  eventFromDraft,
  eventsOn,
  isDraftReady,
  type CalendarEvent,
} from './events';

const hyrox: CalendarEvent = {
  id: 'event-1',
  date: '2026-11-14',
  kind: 'hyrox',
  name: 'HYROX Barcelona',
  place: 'Fira de Barcelona',
  notes: null,
};

describe('isDraftReady', () => {
  it('needs a kind', () => {
    expect(isDraftReady(emptyDraft('2026-11-14'))).toBe(false);
    expect(isDraftReady({ ...emptyDraft('2026-11-14'), kind: 'marathon' })).toBe(true);
  });

  it('needs a name for "Altres"', () => {
    const other = { ...emptyDraft('2026-11-14'), kind: 'other' as const };
    expect(isDraftReady(other)).toBe(false);
    expect(isDraftReady({ ...other, name: '   ' })).toBe(false);
    expect(isDraftReady({ ...other, name: 'Aniversari' })).toBe(true);
  });
});

describe('eventFromDraft', () => {
  it('trims the text and leaves empty fields out', () => {
    expect(
      eventFromDraft(
        { date: '2026-11-14', kind: 'trail', name: '  Trail del Montseny ', place: ' ', notes: '' },
        'event-2',
      ),
    ).toEqual({
      id: 'event-2',
      date: '2026-11-14',
      kind: 'trail',
      name: 'Trail del Montseny',
      place: null,
      notes: null,
    });
  });

  it('is null while not ready', () => {
    expect(eventFromDraft(emptyDraft('2026-11-14'), 'event-2')).toBeNull();
  });

  it('gives back the same event it was drafted from', () => {
    expect(eventFromDraft(draftFrom(hyrox), hyrox.id)).toEqual(hyrox);
  });
});

describe('eventsOn and eventDays', () => {
  const events: CalendarEvent[] = [
    hyrox,
    { ...hyrox, id: 'event-2', date: '2026-12-06', kind: 'marathon', name: null },
    { ...hyrox, id: 'event-3', kind: 'other', name: 'Sopar de l’equip' },
  ];

  it("lists a day's events in the order they were added", () => {
    expect(eventsOn(events, '2026-11-14').map((event) => event.id)).toEqual(['event-1', 'event-3']);
    expect(eventsOn(events, '2026-11-15')).toEqual([]);
  });

  it('knows which days have one', () => {
    expect(eventDays(events)).toEqual(new Set(['2026-11-14', '2026-12-06']));
  });
});
