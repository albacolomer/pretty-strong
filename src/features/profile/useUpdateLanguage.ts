import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { appLanguage, setAppLanguage, type Language } from '@/lib/i18n';

import { updateProfileLanguage } from './api';
import { profileQueryKey } from './useProfile';

// Optimistic update: the app switches language straight away and saves to
// the profile in the background. If saving fails (e.g. no signal), it
// switches back.
export function useUpdateLanguage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (language: Language) => {
      if (!userId) throw new Error('Not signed in.');
      return updateProfileLanguage(userId, language);
    },
    onMutate: async (language) => {
      const previous = appLanguage();
      await setAppLanguage(language);
      return { previous };
    },
    onError: async (_error, _language, context) => {
      if (context) await setAppLanguage(context.previous);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey(userId), profile);
    },
  });
}
