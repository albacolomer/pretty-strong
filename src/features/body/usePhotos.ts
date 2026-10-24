import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { isNetworkError } from '@/lib/errors';

import type { ProgressPhoto } from './photos';
import {
  addProgressPhoto,
  deleteProgressPhoto,
  fetchProgressPhotos,
  fetchSignedUrls,
  setAvatar,
  SIGNED_URL_SECONDS,
} from './photosApi';

export function useProgressPhotos() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['body', userId, 'photos'],
    queryFn: userId ? fetchProgressPhotos : skipToken,
  });
}

// Links to show private pictures, by path; fetched again before they run
// out.
export function usePhotoUrls(paths: readonly string[]) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ['photos', userId, 'urls', ...paths],
    queryFn: userId && paths.length > 0 ? () => fetchSignedUrls(paths) : skipToken,
    staleTime: (SIGNED_URL_SECONDS - 10 * 60) * 1000,
  });
}

// Uploading needs signal; messages live here, so they show after a sheet
// or screen has closed.
function usePhotoMutation<T>(save: (input: T) => Promise<void>, saved: string, refresh: string) {
  const { t } = useTranslation();
  const showToast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: T) => save(input),
    onSuccess: () => showToast({ message: saved }),
    onError: (error) =>
      showToast({
        message: isNetworkError(error) ? t('workout.noSignal') : t('photos.saveError'),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [refresh] }),
  });
}

export function useAddProgressPhoto() {
  const { t } = useTranslation();
  const { session } = useAuth();
  return usePhotoMutation(
    ({ date, base64 }: { date: string; base64: string }) => {
      if (!session) throw new Error('Not signed in.');
      return addProgressPhoto(session.user.id, date, base64);
    },
    t('photos.saved'),
    'body',
  );
}

// A photo can't come back once deleted, so the viewer asks first.
export function useDeleteProgressPhoto() {
  const { t } = useTranslation();
  return usePhotoMutation(
    (photo: ProgressPhoto) => deleteProgressPhoto(photo),
    t('photos.deleted'),
    'body',
  );
}

// A new profile picture, or none (null).
export function useSetAvatar() {
  const { t } = useTranslation();
  const { session } = useAuth();
  return usePhotoMutation(
    ({ base64, oldPath }: { base64: string | null; oldPath: string | null }) => {
      if (!session) throw new Error('Not signed in.');
      return setAvatar(session.user.id, base64, oldPath);
    },
    t('photos.avatarSaved'),
    'profile',
  );
}
