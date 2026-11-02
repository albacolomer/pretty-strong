import {
  daysUntil,
  draftFrom,
  emptyDraft,
  eventDays,
  eventFromDraft,
  eventsOn,
  isDraftReady,
  nextEvent,
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

describe('nextEvent', () => {
  const marathon: CalendarEvent = { ...hyrox, id: 'event-2', date: '2026-12-06', kind: 'marathon' };
  const past: CalendarEvent = { ...hyrox, id: 'event-0', date: '2026-10-04' };

  it('is the nearest one from today on, whatever order they come in', () => {
    expect(nextEvent([marathon, past, hyrox], '2026-11-02')?.id).toBe('event-1');
  });

  it("counts today's", () => {
    expect(nextEvent([marathon, hyrox], '2026-11-14')?.id).toBe('event-1');
    expect(nextEvent([marathon, hyrox], '2026-11-15')?.id).toBe('event-2');
  });

  it('of two on the same day, is the one added first', () => {
    const second = { ...hyrox, id: 'event-3' };
    expect(nextEvent([hyrox, second], '2026-11-02')?.id).toBe('event-1');
  });

  it('is null with none ahead', () => {
    expect(nextEvent([past], '2026-11-02')).toBeNull();
    expect(nextEvent([], '2026-11-02')).toBeNull();
  });
});

describe('daysUntil', () => {
  it('counts calendar days: 0 on the day, 1 the day before', () => {
    expect(daysUntil('2026-11-14', '2026-11-14')).toBe(0);
    expect(daysUntil('2026-11-13', '2026-11-14')).toBe(1);
    expect(daysUntil('2026-11-02', '2026-11-14')).toBe(12);
    expect(daysUntil('2026-11-02', '2027-03-07')).toBe(125);
  });

  it("isn't thrown off by a clock change", () => {
    // Clocks went back on 25 October 2026 and go forward on 28 March 2027.
    expect(daysUntil('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysUntil('2027-03-27', '2027-03-29')).toBe(2);
  });
});
