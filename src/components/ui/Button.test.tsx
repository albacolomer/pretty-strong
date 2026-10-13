import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from './Button';

describe('<Button />', () => {
  test('shows its label as an accessible button', async () => {
    await render(<Button label="Start" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Start' })).toBeOnTheScreen();
  });

  test('calls onPress when tapped', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button label="Start" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Start' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not call onPress when disabled', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button label="Start" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Start' });

    expect(button).toBeDisabled();
    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });
});
