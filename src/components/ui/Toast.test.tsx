import { act, render, screen, userEvent } from '@testing-library/react-native';

import { Button } from './Button';
import { ToastProvider, useToast, type ToastOptions } from './Toast';

function ShowToastButton({ options }: { options: ToastOptions }) {
  const showToast = useToast();
  return <Button label="Show" onPress={() => showToast(options)} />;
}

describe('<ToastProvider />', () => {
  test('shows the message with its action, which runs once and closes the toast', async () => {
    const user = userEvent.setup();
    const onUndo = jest.fn();
    await render(
      <ToastProvider>
        <ShowToastButton options={{ message: 'Archived', action: { label: 'Undo', onPress: onUndo } }} />
      </ToastProvider>,
    );

    await user.press(screen.getByRole('button', { name: 'Show' }));

    expect(screen.getByText('Archived')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Archived')).not.toBeOnTheScreen();
  });

  test('disappears on its own after a few seconds', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await render(
        <ToastProvider>
          <ShowToastButton options={{ message: 'Saved', durationMs: 3000 }} />
        </ToastProvider>,
      );

      await user.press(screen.getByRole('button', { name: 'Show' }));
      expect(screen.getByText('Saved')).toBeOnTheScreen();

      await act(() => jest.advanceTimersByTime(3000));

      expect(screen.queryByText('Saved')).not.toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});
