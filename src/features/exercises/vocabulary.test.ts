import { MUSCLE_GROUPS, MUSCLES } from './vocabulary';

test('every muscle is in exactly one filter group', () => {
  const grouped = MUSCLE_GROUPS.flatMap((group) => [...group.muscles]);

  expect([...grouped].sort()).toEqual([...MUSCLES].sort());
});
