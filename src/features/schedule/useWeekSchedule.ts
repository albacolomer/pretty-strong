import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import type { Routine } from '@/features/routines/routine';
import { routinesQueryKey } from '@/features/routines/useRoutines';

import { addToDay, removeFromDay, type DayEntry } from './api';
import { withDay, withoutDay } from './week';

// Adding a routine to a day, or taking it off, changes the routines list
// straight away (the week comes from it), and puts it back if saving fails.
// Messages live here, not in mutate() callbacks, so they show even if the
// screen has closed.
function useDayMutation(
  save: (entry: DayEntry, userId: string) => Promise<void>,
  change: (routine: Routine, entry: DayEntry) => Routine,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const showToast = useToast();
  const { session } = useAuth();
  const userId = session?.user.id;
  const key = routinesQueryKey(userId);

  return useMutation({
    mutationFn: (entry: DayEntry) => {
      if (!userId) throw new Error('Not signed in.');
      return save(entry, userId);
    },
    onMutate: async (entry) => {
      // Stop a refetch in flight from undoing it in the meantime.
      await queryClient.cancelQueries({ queryKey: key, exact: true });
      const previous = queryClient.getQueryData<Routine[]>(key);
      queryClient.setQueryData<Routine[]>(key, (current) =>
        current?.map((routine) => (routine.id === entry.routineId ? change(routine, entry) : routine)),
      );
      return { previous };
    },
    onError: (_error, _entry, context) => {
      queryClient.setQueryData(key, context?.previous);
      showToast({ message: t('schedule.saveError') });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key, exact: true }),
  });
}

export function useAddToDay() {
  return useDayMutation(addToDay, (routine, entry) =>
    withDay(routine, entry.weekday, entry.position),
  );
}

export function useRemoveFromDay() {
  return useDayMutation(
    (entry) => removeFromDay(entry.routineId, entry.weekday),
    (routine, entry) => withoutDay(routine, entry.weekday),
  );
}
