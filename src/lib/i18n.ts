// Gives React Native a localStorage backed by SQLite, used below to
// remember the chosen language on this phone.
import 'expo-sqlite/localStorage/install';

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

const STORAGE_KEY = 'language';

// The language saved on this phone, if it is one we support; else Catalan.
export function resolveStartupLanguage(stored: string | null): Language {
  return stored !== null && isLanguage(stored) ? stored : defaultLanguage;
}

// Remembering the language is a convenience: if storage fails, the app
// still works in the default language.
function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const i18n = createInstance();

// initReactI18next hands this instance to useTranslation() in every component.
i18n.use(initReactI18next).init({
  resources,
  // Reading the phone's copy is instant, so the first screen is already in
  // the right language, even before the profile loads or with no signal.
  lng: resolveStartupLanguage(readStoredLanguage()),
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

export function appLanguage(): Language {
  return isLanguage(i18n.language) ? i18n.language : defaultLanguage;
}

// Switches the whole interface and remembers the choice on this phone.
export async function setAppLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not critical: the profile still has the language.
  }
}

export default i18n;
