import 'i18next';

import type ca from '@/locales/ca.json';

// Types every t('...') key against ca.json, so a typo fails the type check.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof ca;
    };
  }
}
