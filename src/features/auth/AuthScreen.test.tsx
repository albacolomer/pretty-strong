import '@/lib/i18n';

import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AuthScreen, AuthSwitch } from './AuthScreen';

describe('<AuthScreen />', () => {
  test('the name and line on the steel, then the title, the form and the link', async () => {
    const user = userEvent.setup();
    const onSwitch = jest.fn();
    await render(
      <AuthScreen
        title="Hola de nou"
        subtitle="Entra per començar l'entrenament d'avui"
        footer={
          <AuthSwitch question="Encara no tens compte?" action="Crea'n un" onPress={onSwitch} />
        }>
        <Text>Formulari</Text>
      </AuthScreen>,
    );

    expect(screen.getByRole('header', { name: 'Pretty\nStrong' })).toBeOnTheScreen();
    expect(
      screen.getByText('Entrena a la teva manera. Registra cada repetició.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Hola de nou' })).toBeOnTheScreen();
    expect(screen.getByText('Formulari')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: "Encara no tens compte? Crea'n un" }));
    expect(onSwitch).toHaveBeenCalled();
  });
});
