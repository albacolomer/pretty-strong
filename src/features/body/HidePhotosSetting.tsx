import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Switch } from 'react-native';

import { SettingsRow, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { updateHidePhotos, type Profile } from '@/features/profile/api';
import { profileQueryKey, useProfile } from '@/features/profile/useProfile';
import { authenticate, canAuthenticate } from '@/lib/deviceAuth';
import { isNetworkError } from '@/lib/errors';
import { useTheme } from '@/theme';

import { lockPhotos } from './usePhotoLock';

// Settings → Privadesa → "Amaga les fotos de progrés" (US-28), a row with
// a switch for a SettingsCard. Hidden photos show blurred until unlocked
// with Face ID or the passcode. Turning it on needs a passcode on the
// phone (or the photos couldn't be unlocked); turning it off asks for
// Face ID first, or anyone holding the phone could.
export function HidePhotosSetting() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: profile } = useProfile();
  const key = profileQueryKey(userId);

  // Shown at once, put back if saving fails.
  const save = useMutation({
    mutationFn: (hide: boolean) => {
      if (!userId) throw new Error('Not signed in.');
      return updateHidePhotos(userId, hide);
    },
    onMutate: async (hide) => {
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<Profile>(key);
      if (previous) queryClient.setQueryData<Profile>(key, { ...previous, hide_progress_photos: hide });
      return { previous };
    },
    onError: (error, _hide, context) => {
      queryClient.setQueryData(key, context?.previous);
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('profile.saveError'),
      });
    },
    onSuccess: (saved) => queryClient.setQueryData(key, saved),
  });

  async function change(hide: boolean) {
    if (hide) {
      if (!(await canAuthenticate())) {
        showToast({ message: t('photos.needsPasscode') });
        return;
      }
      lockPhotos();
      save.mutate(true);
      return;
    }
    if (await authenticate(t('photos.unlockPrompt'), t('common.cancel'))) save.mutate(false);
  }

  return (
    <SettingsRow
      icon="eye.slash"
      label={t('photos.hide')}
      accessory={
        <Switch
          accessibilityLabel={t('photos.hide')}
          value={profile?.hide_progress_photos ?? false}
          onValueChange={(hide) => void change(hide)}
          disabled={!profile || save.isPending}
          trackColor={{ true: colors.accent, false: colors.surfaceRaised }}
        />
      }
    />
  );
}
