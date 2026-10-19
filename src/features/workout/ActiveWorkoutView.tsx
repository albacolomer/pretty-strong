import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { spacing, touch, useTheme } from '@/theme';

import { countSets, toggleSet, updateTyped, type ActiveWorkout } from './activeWorkout';
import { useElapsed } from './useElapsed';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useWorkoutStore } from './workoutStore';

// The workout screen (spec: Active workout), full screen over the tabs.
// `onClose` hides it; the workout carries on and Today offers "Reprèn".
export function ActiveWorkoutView({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const active = useWorkoutStore((state) => state.active);

  if (!active) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text color="textMuted">{t('workout.noWorkout')}</Text>
        <Button label={t('workout.close')} variant="secondary" onPress={onClose} />
      </View>
    );
  }
  return <Workout workout={active} onClose={onClose} />;
}

function Workout({ workout, onClose }: { workout: ActiveWorkout; onClose: () => void }) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const update = useWorkoutStore((state) => state.update);
  const finish = useWorkoutStore((state) => state.finish);
  const discard = useWorkoutStore((state) => state.discard);
  const elapsed = useElapsed(workout.startedAt);
  // Gym UX rule 5: the screen stays on while the workout is open.
  useKeepAwake();

  function toggle(exerciseId: string, setId: string, wasDone: boolean) {
    update((current) => toggleSet(current, exerciseId, setId, new Date().toISOString()));
    // Gym UX rule 6: a soft tap on every ✓.
    if (!wasDone) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function confirmDiscard() {
    // Throwing a workout away can't be undone, so this one asks.
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('workout.discardTitle'),
        options: [t('workout.discard'), t('workout.keepGoing')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index !== 0) return;
        onClose();
        discard();
      },
    );
  }

  function confirmFinish() {
    const { done, total } = countSets(workout);
    if (done === 0) {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t('workout.noSetsTitle'),
          options: [t('workout.discard'), t('workout.keepGoing')],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
          userInterfaceStyle: scheme,
        },
        (index) => {
          if (index !== 0) return;
          onClose();
          discard();
        },
      );
      return;
    }
    const save = () => {
      onClose();
      finish(new Date().toISOString());
    };
    if (done === total) {
      save();
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('workout.finishTitle'),
        message: t('workout.unfinishedSets', { count: total - done }),
        options: [t('workout.finish'), t('workout.keepGoing')],
        cancelButtonIndex: 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === 0) save();
      },
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.surfaceRaised },
        ]}>
        <Pressable
          role="button"
          aria-label={t('workout.hide')}
          onPress={onClose}
          style={({ pressed }) => [styles.hide, pressed && styles.pressed]}>
          <Text variant="cardTitle" color="textMuted">
            ⌄
          </Text>
        </Pressable>
        <View style={styles.title}>
          <Text variant="bodyStrong" numberOfLines={1} accessibilityRole="header">
            {workout.routineName}
          </Text>
          <Text variant="caption" color="textMuted" style={styles.elapsed}>
            {elapsed}
          </Text>
        </View>
        <View style={styles.hide} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        {workout.exercises.map((exercise) => (
          <WorkoutExerciseCard
            key={exercise.id}
            exercise={exercise}
            onType={(setId, change) =>
              update((current) => updateTyped(current, exercise.id, setId, change))
            }
            onToggle={(setId) =>
              toggle(
                exercise.id,
                setId,
                exercise.sets.some((set) => set.id === setId && set.completedAt !== null),
              )
            }
          />
        ))}

        {workout.exercises.length === 0 ? (
          <Text color="textMuted">{t('workout.noExercises')}</Text>
        ) : null}

        <Button label={t('workout.finish')} onPress={confirmFinish} />
        <Button label={t('workout.discard')} variant="ghost" onPress={confirmDiscard} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hide: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    alignItems: 'center',
  },
  elapsed: {
    fontVariant: ['tabular-nums'],
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pressed: {
    opacity: 0.75,
  },
});
