import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Sheet, Text } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import type { Routine, RoutineExercise } from '@/features/routines/routine';
import { runBlockKind, runBlockSummary } from '@/features/routines/runBlocks';
import { formatInput } from '@/features/routines/targets';
import { formatElapsed } from '@/features/workout/useElapsed';
import { useAppLanguage, type Language } from '@/lib/i18n';
import { spacing } from '@/theme';

// "Previsualitza" on Avui: the routine's exercises in order, each with its
// first-time plan, before starting. "Comença" from here too.
export function RoutinePreviewSheet({
  routine,
  visible,
  onClose,
  onStart,
}: {
  routine: Routine | null;
  visible: boolean;
  onClose: () => void;
  // Left out when it can't be started from here.
  onStart?: () => void;
}) {
  const { t } = useTranslation();
  const language = useAppLanguage();

  return (
    <Sheet
      visible={visible && routine !== null}
      title={routine?.name ?? ''}
      cancelLabel={t('workout.close')}
      onCancel={onClose}
      onSave={onStart}
      saveLabel={onStart ? t('workout.start') : undefined}>
      {routine ? (
        <>
          {routine.description ? <Text color="textMuted">{routine.description}</Text> : null}
          {routine.exercises.map((item) => (
            <View key={item.id} style={styles.row}>
              <ExercisePicture exercise={item.exercise} size={40} />
              <View style={styles.text}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {exerciseName(item.exercise, language)}
                </Text>
                <Text variant="caption" color="textMuted">
                  {planSummary(item, routine.label === 'run', language, t)}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </Sheet>
  );
}

// "3 sèries · 10 reps · 40 kg", or a run block's "6 × 400 m".
function planSummary(
  item: RoutineExercise,
  run: boolean,
  language: Language,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (run) return runBlockSummary(runBlockKind(item.sets), item.sets, language);
  const [first] = item.sets;
  return [
    t('history.sets', { count: item.sets.length }),
    first?.reps ? t('workout.vs.reps', { count: first.reps }) : null,
    first?.weightKg ? `${formatInput(first.weightKg, language)} kg` : null,
    first?.durationS ? formatElapsed(first.durationS * 1000) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
});
