import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';

import { updateProfileDetails, type ProfileChanges } from './api';
import { profileQueryKey } from './useProfile';

// Saves Edita el perfil. Messages live here, so they show after the screen
// has closed.
export function useUpdateProfile() {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (details: ProfileChanges) => {
      if (!userId) throw new Error('Not signed in.');
      return updateProfileDetails(userId, details);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(userId), profile);
      showToast({ message: t('profile.saved') });
    },
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('profile.saveError'),
      }),
  });
}
