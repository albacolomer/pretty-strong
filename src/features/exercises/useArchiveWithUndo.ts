import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';

import { exerciseName, type Exercise } from './exercise';
import { useArchiveExercise, useRestoreExercise } from './useArchiveExercise';

// Archive with an undo toast instead of "Are you sure?" (it's reversible).
// Used by the library's ⋯ menu and the exercise detail screen. The toast
// shows straight away, like the optimistic update; if saving fails, the
// archive hook puts the exercise back and shows an error instead.
export function useArchiveWithUndo() {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const showToast = useToast();
  const archive = useArchiveExercise();
  const restore = useRestoreExercise();

  return function archiveExercise(exercise: Exercise) {
    archive.mutate(exercise.id);
    showToast({
      message: t('exercises.archived', { name: exerciseName(exercise, language) }),
      action: { label: t('common.undo'), onPress: () => restore.mutate(exercise.id) },
    });
  };
}
