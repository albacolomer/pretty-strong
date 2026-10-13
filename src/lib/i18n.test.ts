import i18n, { appLanguage, resolveStartupLanguage, setAppLanguage } from './i18n';

afterEach(async () => {
  await setAppLanguage('ca');
  localStorage.clear();
});

describe('resolveStartupLanguage', () => {
  test.each(['ca', 'es', 'en'] as const)('uses a saved %s', (language) => {
    expect(resolveStartupLanguage(language)).toBe(language);
  });

  test.each([null, '', 'fr', 'ES'])('falls back to Catalan for %j', (stored) => {
    expect(resolveStartupLanguage(stored)).toBe('ca');
  });
});

describe('setAppLanguage', () => {
  test('switches the interface and remembers the choice on the phone', async () => {
    await setAppLanguage('es');

    expect(appLanguage()).toBe('es');
    expect(i18n.t('tabs.today')).toBe('Hoy');
    expect(localStorage.getItem('language')).toBe('es');
  });
});
