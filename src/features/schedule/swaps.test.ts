import { parseSwaps, withSwap, type Swaps } from './swaps';

describe('withSwap', () => {
  test('swaps a planned routine for a day, and takes the swap off again', () => {
    const swapped = withSwap({}, '2026-10-20', 'upper', { routineId: 'legs', reason: 'tired' }, '2026-10-19');
    expect(swapped).toEqual({ '2026-10-20': { upper: { routineId: 'legs', reason: 'tired' } } });

    expect(withSwap(swapped, '2026-10-20', 'upper', null, '2026-10-19')).toEqual({});
  });

  test('a sport can take the routine’s place', () => {
    const swap = { sport: 'padel' as const, sportName: null, reason: null };

    expect(withSwap({}, '2026-10-20', 'upper', swap, '2026-10-19')).toEqual({
      '2026-10-20': { upper: swap },
    });
  });

  test('drops the days before this week', () => {
    const old: Swaps = { '2026-10-12': { upper: { routineId: 'legs', reason: null } } };

    const next = withSwap(old, '2026-10-21', 'run', { routineId: 'bike', reason: null }, '2026-10-19');

    expect(Object.keys(next)).toEqual(['2026-10-21']);
  });
});

describe('parseSwaps', () => {
  test('reads what the phone saved, and nothing when it’s missing or broken', () => {
    expect(parseSwaps('{"2026-10-20":{"upper":{"routineId":"legs","reason":null}}}')).toEqual({
      '2026-10-20': { upper: { routineId: 'legs', reason: null } },
    });
    expect(parseSwaps(null)).toEqual({});
    expect(parseSwaps('not json')).toEqual({});
  });
});
