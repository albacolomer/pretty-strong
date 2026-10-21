import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

import { usePastWorkout } from './useHistory';
import { WorkoutEditor } from './WorkoutEditor';
import { detailsFromPast, draftFromPast } from './workoutDraft';

// History → a workout → Edita (US-23).
export function EditPastWorkout({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: workout, isPending, isError } = usePastWorkout(id);

  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('history.loadError')}</Text>;
  if (!workout) return <Text color="textMuted">{t('history.notFound')}</Text>;
  return (
    <WorkoutEditor
      initialDraft={draftFromPast(workout)}
      initialDetails={detailsFromPast(workout)}
      original={workout}
      onClose={onClose}
    />
  );
}
