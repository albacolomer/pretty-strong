import { act } from '@testing-library/react-native';
import { createElement, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';
import type { SortableGridProps } from 'react-native-sortables';

// A stand-in for react-native-sortables in tests, where real dragging can't
// happen. Use it with:
//   jest.mock('react-native-sortables', () => jest.requireActual('@/test-utils/sortablesMock'));
// It renders every item in order, and drop() acts like a finished drag.

let lastGridProps: SortableGridProps<unknown> | null = null;

function Grid<I>(props: SortableGridProps<I>) {
  lastGridProps = props as SortableGridProps<unknown>;
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

export default { Grid, Handle };

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
