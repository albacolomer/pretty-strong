import { render, screen, userEvent, within } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { MenuHost } from './Menu';
import { useActionSheet } from './useActionSheet';

const onPick = jest.fn();

// A screen with a button that opens a menu.
function Opener() {
  const showActionSheet = useActionSheet();
  return (
    <Pressable
      role="button"
      onPress={() =>
        showActionSheet(
          {
            title: 'Tren superior 1',
            options: ['Obre', 'Arxiva', 'Cancel·la'],
            cancelButtonIndex: 2,
            destructiveButtonIndex: 1,
          },
          onPick,
        )
      }>
      <Text>Opcions</Text>
    </Pressable>
  );
}

beforeEach(() => onPick.mockClear());

describe('<MenuHost />', () => {
  test('shows the title and options, Cancel·la last, and says which was picked', async () => {
    const user = userEvent.setup();
    await render(
      <>
        <Opener />
        <MenuHost />
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Opcions' }));
    expect(screen.getByRole('header', { name: 'Tren superior 1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Arxiva' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Obre' }));

    expect(onPick).toHaveBeenCalledWith(0);
    // The menu has gone.
    expect(screen.queryByRole('button', { name: 'Cancel·la' })).not.toBeOnTheScreen();
  });

  test('Cancel·la answers with its own index', async () => {
    const user = userEvent.setup();
    await render(
      <>
        <Opener />
        <MenuHost />
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Opcions' }));
    await user.press(screen.getByRole('button', { name: 'Cancel·la' }));

    expect(onPick).toHaveBeenCalledWith(2);
  });

  test('opens on the top-most layer, e.g. over an open sheet', async () => {
    const user = userEvent.setup();
    const { rerender } = await render(
      <>
        <Opener />
        <View testID="app">
          <MenuHost />
        </View>
        <View testID="sheet">
          <MenuHost />
        </View>
      </>,
    );

    await user.press(screen.getByRole('button', { name: 'Opcions' }));
    expect(within(screen.getByTestId('sheet')).getByRole('button', { name: 'Obre' })).toBeOnTheScreen();
    expect(within(screen.getByTestId('app')).queryByRole('button', { name: 'Obre' })).toBeNull();

    // The sheet closes: the app's own layer is the top one again.
    await rerender(
      <>
        <Opener />
        <View testID="app">
          <MenuHost />
        </View>
      </>,
    );
    await user.press(screen.getByRole('button', { name: 'Opcions' }));
    expect(within(screen.getByTestId('app')).getByRole('button', { name: 'Obre' })).toBeOnTheScreen();
  });
});
