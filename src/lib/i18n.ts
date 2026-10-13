import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import ca from '@/locales/ca.json';
import en from '@/locales/en.json';
import es from '@/locales/es.json';

export const languages = ['ca', 'es', 'en'] as const;
export type Language = (typeof languages)[number];
export const defaultLanguage: Language = 'ca';

export function isLanguage(code: string): code is Language {
  return (languages as readonly string[]).includes(code);
}

// Catalan is the source of truth: if es or en is missing a key that ca has,
// `satisfies` makes the type check fail.
type Translations = typeof ca;

export const resources = {
  ca: { translation: ca },
  es: { translation: es satisfies Translations },
  en: { translation: en satisfies Translations },
} as const;

const i18n = createInstance();

// initReactI18next hands this instance to useTranslation() in every component.
i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: defaultLanguage,
  supportedLngs: languages,
  // Translations are bundled with the app, so init can finish synchronously
  // and the first render already has the right text.
  initAsync: false,
  interpolation: {
    // React already escapes values when rendering.
    escapeValue: false,
  },
});

export default i18n;
