import { useEffect } from 'react';

import { appLanguage, isLanguage, setAppLanguage } from '@/lib/i18n';

import { useProfile } from './useProfile';

// Once someone is signed in, their profile's language wins over the one
// saved on the phone, so it follows them to any phone. Used in the tabs
// layout, which only exists while signed in.
export function useSyncProfileLanguage() {
  const { data: profile } = useProfile();
  const profileLanguage = profile?.language;

  useEffect(() => {
    if (profileLanguage && isLanguage(profileLanguage) && profileLanguage !== appLanguage()) {
      void setAppLanguage(profileLanguage);
    }
  }, [profileLanguage]);
}
