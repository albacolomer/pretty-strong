import { render, screen } from '@testing-library/react-native';

import { GradientText } from './GradientText';

describe('<GradientText />', () => {
  test('is read once, though it is drawn twice (stencil and sizing copy)', async () => {
    await render(<GradientText accessibilityRole="header">Avui</GradientText>);

    expect(screen.getAllByText('Avui')).toHaveLength(1);
    expect(screen.getByRole('header', { name: 'Avui' })).toBeOnTheScreen();
  });
});
