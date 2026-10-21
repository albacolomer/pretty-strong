import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { ExercisePicker } from '@/features/exercises/ExercisePicker';
import { ReorderExercisesSheet } from '@/features/routines/ReorderExercisesSheet';
import { cancelScheduled, setWorkoutScreenOpen } from '@/lib/notifications';
import { spacing, touch, useTheme } from '@/theme';

import {
  afterSet,
  countSets,
  dropWorkoutExercise,
  nextSet,
  toggleSet,
  updateTyped,
  workoutSegments,
  type ActiveExercise,
  type ActiveWorkout,
} from './activeWorkout';
import { RestTimerBar } from './RestTimerBar';
import { useElapsed } from './useElapsed';
import { useLastTime } from './useLastTime';
import { useRestTimer } from './useRestTimer';
import { useWorkoutChanges } from './useWorkoutChanges';
import { WorkoutExerciseCard } from './WorkoutExerciseCard';
import { useWorkoutStore } from './workoutStore';
import { WorkoutSummaryView } from './WorkoutSummaryView';

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
  const restTimer = useRestTimer(workout);
  const changes = useWorkoutChanges(workout, {
    update,
    current: () => useWorkoutStore.getState().active,
  });
  // Set once "Acaba" is tapped: the summary shows, with this as the end.
  const [finishingAt, setFinishingAt] = useState<string | null>(null);
  // Pre-fills from last time (US-13), once there's signal.
  useLastTime(workout, update);
  // Gym UX rule 5: the screen stays on while the workout is open.
  useKeepAwake();
  // While it's open, "rest is over" shows here, not as a notification.
  useEffect(() => {
    setWorkoutScreenOpen(true);
    return () => setWorkoutScreenOpen(false);
  }, []);

  // ✓: the set is done, with a soft tap (gym UX rule 6), and rest starts;
  // in a superset, straight on to the next exercise of the round instead.
  function toggle(exerciseId: string, setId: string, wasDone: boolean) {
    update((current) => toggleSet(current, exerciseId, setId, new Date().toISOString()));
    if (wasDone) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = useWorkoutStore.getState().active;
    if (!updated) return;
    const { restS, next } = afterSet(updated, setId);
    if (restS) restTimer.start(restS, next);
    else restTimer.skip();
  }

  // Leaving the workout: no "rest is over" afterwards.
  function leave(then: () => void) {
    void cancelScheduled(workout.rest?.notificationId ?? null);
    onClose();
    then();
  }

  const upNext = nextSet(workout)?.setId ?? null;

  function card(exercise: ActiveExercise) {
    return (
      <WorkoutExerciseCard
        key={exercise.id}
        exercise={exercise}
        nextSetId={upNext}
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
        onMenu={() => changes.openExerciseMenu(exercise)}
        onSetMenu={(setId) => changes.openSetMenu(exercise, setId)}
        onAddSet={() => changes.addSet(exercise)}
        onNotesChange={(notes) => changes.setNotes(exercise, notes)}
        onSaveNoteToRoutine={
          exercise.routineExerciseId ? () => changes.saveNote(exercise) : undefined
        }
      />
    );
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
        if (index === 0) leave(discard);
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
          if (index === 0) leave(discard);
        },
      );
      return;
    }
    // The summary comes first (US-21): no more rest, and the clock stops.
    const summary = () => {
      restTimer.skip();
      setFinishingAt(new Date().toISOString());
    };
    if (done === total) {
      summary();
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
        if (index === 0) summary();
      },
    );
  }

  if (finishingAt) {
    return (
      <WorkoutSummaryView
        workout={workout}
        endedAt={finishingAt}
        onBack={() => setFinishingAt(null)}
        onSave={(wrapUp) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          leave(() => finish(finishingAt, wrapUp));
        }}
      />
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
        contentContainerStyle={[
          styles.content,
          // The rest bar adds the safe area itself.
          { paddingBottom: (workout.rest ? 0 : insets.bottom) + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets>
        {workoutSegments(workout).map(({ groupKey, exercises }) =>
          groupKey === null ? (
            card(exercises[0])
          ) : (
            <GroupBlock key={groupKey} exercises={exercises}>
              {exercises.map(card)}
            </GroupBlock>
          ),
        )}

        {workout.exercises.length === 0 ? (
          <Text color="textMuted">{t('workout.noExercises')}</Text>
        ) : null}

        <Button
          label={t('workout.addExercises')}
          variant="secondary"
          onPress={changes.openAddPicker}
        />
        <Button label={t('workout.finish')} onPress={confirmFinish} />
        <Button label={t('workout.discard')} variant="ghost" onPress={confirmDiscard} />
      </ScrollView>

      <ExercisePicker
        visible={changes.picker !== null}
        single={changes.picker?.swapId != null}
        onClose={changes.closePicker}
        onAdd={changes.pickerDone}
        onDismissed={changes.onPickerDismissed}
      />
      <ReorderExercisesSheet
        visible={changes.reordering}
        items={workout.exercises}
        keyOf={(exercise) => exercise.id}
        exerciseOf={(exercise) => exercise.exercise}
        drop={dropWorkoutExercise}
        onClose={changes.closeReorder}
        onDone={changes.reorderDone}
      />

      {restTimer.rest ? (
        <RestTimerBar
          rest={restTimer.rest}
          nextLabel={restTimer.nextLabel}
          onPause={restTimer.pause}
          onResume={restTimer.resume}
          onAdjust={restTimer.adjust}
          onSkip={restTimer.skip}
          onEnd={restTimer.end}
        />
      ) : null}
    </View>
  );
}

// A superset or circuit (spec: GroupBracket): a pink bracket joining its
// exercises, with the round you're on.
function GroupBlock({ exercises, children }: { exercises: ActiveExercise[]; children: ReactNode }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rounds = Math.max(...exercises.map((exercise) => exercise.sets.length));
  const roundsDone = Math.min(
    ...exercises.map((exercise) => exercise.sets.filter((set) => set.completedAt !== null).length),
  );
  const kind = exercises.length > 2 ? 'circuit' : 'superset';

  return (
    <View style={[styles.group, { borderLeftColor: colors.accent }]}>
      <View style={styles.groupHeader}>
        <Text variant="bodyStrong" color="accent" accessibilityRole="header">
          {t(`routines.group.${kind}`)}
        </Text>
        <Text variant="caption" color="textMuted">
          {t('workout.round', { round: Math.min(rounds, roundsDone + 1), rounds })}
        </Text>
      </View>
      {children}
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
  group: {
    gap: spacing.sm,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.75,
  },
});
