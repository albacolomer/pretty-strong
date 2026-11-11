import { act } from '@testing-library/react-native';
import { createElement, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import type { SortableGridProps } from 'react-native-sortables';

// A stand-in for react-native-sortables in tests, where real dragging can't
// happen. Use it with:
//   jest.mock('react-native-sortables', () => jest.requireActual('@/test-utils/sortablesMock'));
// It renders every item in order, and drop() acts like a finished drag.
// Drop zones render as views with testID "sortable-zone": startDrag() then
// fireEvent(zone, 'itemDrop') acts like dragging a row onto one.

let lastGridProps: SortableGridProps<unknown> | null = null;
// The list each item was last rendered in, by its key (with the same key
// in two lists, the later one).
const gridOfKey = new Map<string, { props: SortableGridProps<unknown>; index: number }>();

function Grid<I>(props: SortableGridProps<I>) {
  lastGridProps = props as SortableGridProps<unknown>;
  props.data.forEach((item, index) => {
    const key = props.keyExtractor ? props.keyExtractor(item) : String(index);
    gridOfKey.set(key, { props: props as SortableGridProps<unknown>, index });
  });
  return createElement(
    View,
    null,
    props.data.map((item, index) =>
      createElement(
        Fragment,
        { key: props.keyExtractor ? props.keyExtractor(item) : String(index) },
        props.renderItem({ item, index } as Parameters<typeof props.renderItem>[0]),
      ),
    ),
  );
}

function Handle({ children }: { children?: ReactNode }) {
  return createElement(Fragment, null, children);
}

function MultiZoneProvider({ children }: { children?: ReactNode }) {
  return createElement(Fragment, null, children);
}

// Its handlers stay on the view, so a test can fire them.
function BaseZone(props: Record<string, unknown>) {
  return createElement(View, { ...props, testID: 'sortable-zone' });
}

export default { Grid, Handle, MultiZoneProvider, BaseZone };

// Picks up the item with this key, as a drag starting on it would.
export async function startDrag(key: string) {
  const found = gridOfKey.get(key);
  if (!found) throw new Error(`No item ${key} rendered.`);
  await act(async () => {
    found.props.onDragStart?.({ key, fromIndex: found.index, indexToKey: [], keyToIndex: {} });
  });
}

// Drags the item at `fromIndex` to `toIndex` in the last rendered list.
export async function drop(fromIndex: number, toIndex: number) {
  const props = lastGridProps;
  if (!props) throw new Error('No sortable list rendered.');
  const data = [...props.data];
  const [item] = data.splice(fromIndex, 1);
  data.splice(toIndex, 0, item);
  await act(async () => {
    props.onDragEnd?.({ data, key: '', fromIndex, toIndex, indexToKey: [], keyToIndex: {} });
  });
}
