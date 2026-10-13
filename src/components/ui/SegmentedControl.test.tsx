import { render, screen, userEvent } from '@testing-library/react-native';

import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 'ca', label: 'Català' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
] as const;

describe('<SegmentedControl />', () => {
  test('marks only the current value as selected', async () => {
    await render(
      <SegmentedControl label="Language" options={options} value="es" onChange={jest.fn()} />,
    );

    // Each option is its own screen-reader element (the group itself is not,
    // or VoiceOver would read the three options as one block).
    expect(screen.getByRole('radio', { name: 'Español' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Català' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
  });

  test('reports a newly picked option, but not the current one', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<SegmentedControl label="Language" options={options} value="ca" onChange={onChange} />);

    await user.press(screen.getByRole('radio', { name: 'Català' }));
    await user.press(screen.getByRole('radio', { name: 'English' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('en');
  });
});
