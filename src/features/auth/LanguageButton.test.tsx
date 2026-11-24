import { render, screen, userEvent } from '@testing-library/react-native';

import { appLanguage, setAppLanguage } from '@/lib/i18n';

import { LanguageButton } from './LanguageButton';

afterEach(() => setAppLanguage('ca'));

describe('<LanguageButton />', () => {
  test('opens a menu under it with the current language ticked; a pick switches the app', async () => {
    const user = userEvent.setup();
    await render(<LanguageButton />);

    expect(screen.queryByRole('radio', { name: 'Español' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Idioma, Català' }));
    expect(screen.getByRole('radio', { name: 'Català' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();

    await user.press(screen.getByRole('radio', { name: 'Español' }));

    expect(appLanguage()).toBe('es');
    expect(await screen.findByRole('button', { name: 'Idioma, Español' })).toBeOnTheScreen();
    // Closed once picked.
    expect(screen.queryByRole('radio', { name: 'English' })).toBeNull();
  });

  test('a second tap on the icon closes it without changing anything', async () => {
    const user = userEvent.setup();
    await render(<LanguageButton />);

    await user.press(screen.getByRole('button', { name: 'Idioma, Català' }));
    await user.press(screen.getByRole('button', { name: 'Idioma, Català' }));

    expect(screen.queryByRole('radio', { name: 'Català' })).toBeNull();
    expect(appLanguage()).toBe('ca');
  });
});
