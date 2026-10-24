import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { useProfile } from '@/features/profile/useProfile';
import { authenticate } from '@/lib/deviceAuth';

// Whether hidden progress photos are showing right now. In memory only,
// so they always start hidden.
const usePhotoLockStore = create<{ unlocked: boolean }>(() => ({ unlocked: false }));

export function lockPhotos() {
  usePhotoLockStore.setState({ unlocked: false });
}

// "Amaga les fotos de progrés" (US-28): when it's on, photos show blurred
// until Face ID (or the passcode) unlocks them, like the iPhone's Hidden
// album. `unlock` asks, and resolves true once they show.
export function useHiddenPhotos(): { hidden: boolean; unlock: () => Promise<boolean> } {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const unlocked = usePhotoLockStore((state) => state.unlocked);
  const hidden = (profile?.hide_progress_photos ?? false) && !unlocked;

  return {
    hidden,
    unlock: async () => {
      if (!hidden) return true;
      const ok = await authenticate(t('photos.unlockPrompt'), t('common.cancel'));
      if (ok) usePhotoLockStore.setState({ unlocked: true });
      return ok;
    },
  };
}

// Hidden again once the app goes to the background. ("inactive" isn't
// enough: the Face ID prompt itself makes the app inactive.) Mounted once,
// under the tabs.
export function useLockPhotosInBackground() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') lockPhotos();
    });
    return () => subscription.remove();
  }, []);
}
