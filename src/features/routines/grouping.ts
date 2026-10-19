// Supersets and circuits (US-08) in any list of exercises, a routine's or a
// workout's: items with the same groupKey are a group, always next to each
// other. No React here.

type Grouped = { groupKey: string | null };

// A group needs at least two exercises; one left on its own is ungrouped.
export function withoutLoneGroups<T extends Grouped>(items: T[]): T[] {
  const sizes = new Map<string, number>();
  for (const { groupKey } of items) {
    if (groupKey !== null) sizes.set(groupKey, (sizes.get(groupKey) ?? 0) + 1);
  }
  return items.map((item) =>
    item.groupKey !== null && sizes.get(item.groupKey) === 1 ? { ...item, groupKey: null } : item,
  );
}

// Moves one item to a new place, as a drag in the reorder sheet does.
// Dropped between two items of a group, it joins that group (`join` says
// how, e.g. taking the group's rest); moved away from its own group, it
// leaves it.
export function moveWithinGroups<T extends Grouped>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
  join: (item: T, member: T, groupKey: string) => T,
): T[] {
  const list = [...items];
  const [moved] = list.splice(fromIndex, 1);
  if (!moved) return list;
  list.splice(toIndex, 0, moved);

  const above = list[toIndex - 1];
  const below = list[toIndex + 1];
  if (above?.groupKey && above.groupKey === below?.groupKey) {
    list[toIndex] = join(moved, above, above.groupKey);
  } else if (
    moved.groupKey === null ||
    (above?.groupKey !== moved.groupKey && below?.groupKey !== moved.groupKey)
  ) {
    list[toIndex] = { ...moved, groupKey: null };
  }
  return withoutLoneGroups(list);
}
