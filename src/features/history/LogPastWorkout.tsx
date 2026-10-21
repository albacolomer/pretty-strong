import { randomUUID } from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Text } from '@/components/ui';
import { APP_DEFAULT_REST_S } from '@/features/exercises/rest';
import { useExerciseSettings } from '@/features/exercises/useExerciseSettings';
import { useRoutines } from '@/features/routines/useRoutines';
import { useTheme } from '@/theme';

import { WorkoutEditor } from './WorkoutEditor';
import { draftForDay } from './workoutDraft';

type LogPastWorkoutProps = {
  date: string;
  // The routine done; null for a workout without one.
  routineId: string | null;
  onClose: () => void;
};

// History → + (US-24): a workout done on `date`, logged afterwards. It
// starts from the routine and last time, to be ticked off.
export function LogPastWorkout({ date, routineId, onClose }: LogPastWorkoutProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const routines = useRoutines();
  const settings = useExerciseSettings();

  if (routines.isPending || settings.isPending) return <ActivityIndicator color={colors.accent} />;
  if (routines.isError) return <Text color="danger">{t('history.loadError')}</Text>;
  const routine = routines.data.find((item) => item.id === routineId) ?? null;

  return (
    <WorkoutEditor
      initialDraft={draftForDay(
        routine,
        date,
        randomUUID,
        (exerciseId) => settings.data?.[exerciseId]?.defaultRestS ?? APP_DEFAULT_REST_S,
      )}
      initialDetails={{ date, durationS: routine?.plannedDurationS ?? null, energy: null, notes: '' }}
      original={null}
      onClose={onClose}
    />
  );
}
