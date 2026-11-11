import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, NumberInput, Text, TextField } from '@/components/ui';
import { ExercisePicker } from '@/features/exercises/ExercisePicker';
import { ExerciseInfoSheet } from '@/features/exercises/ExerciseInfoSheet';
import { ReorderExercisesSheet } from '@/features/routines/ReorderExercisesSheet';
import { dateKey } from '@/features/schedule/dates';
import { DayStepper } from '@/features/schedule/DayStepper';
import { useToday } from '@/features/schedule/useToday';
import {
  dropWorkoutExercise,
  toggleSet,
  updateTyped,
  type ActiveWorkout,
} from '@/features/workout/activeWorkout';
import { FeelingSlider } from '@/features/workout/FeelingSlider';
import { readMinutes, SESSION_NOTES_MAX_LENGTH } from '@/features/workout/session';
import { useLastTime } from '@/features/workout/useLastTime';
import { useWorkoutChanges } from '@/features/workout/useWorkoutChanges';
import { WorkoutExerciseCard } from '@/features/workout/WorkoutExerciseCard';
import { spacing } from '@/theme';

import type { PastWorkout } from './pastWorkout';
import { useSaveWorkout } from './useHistory';
import { doneAt, toPastWorkout, type DraftDetails } from './workoutDraft';

type WorkoutEditorProps = {
  initialDraft: ActiveWorkout;
  initialDetails: DraftDetails;
  // The saved workout being edited; null when logging a new one.
  original: PastWorkout | null;
  // After saving, or on "Cancel·la".
  onClose: () => void;
};

// Edits a past workout (US-23) or logs one afterwards (US-24): the day, how
// long, how it felt and a note, then the same exercise cards as a live workout,
// with no rest timer. Ticked sets are the ones saved. Nothing changes until
// "Desa".
export function WorkoutEditor({ initialDraft, initialDetails, original, onClose }: WorkoutEditorProps) {
  const { t } = useTranslation();
  const today = useToday();
  // Changes apply to the ref straight away, so the menus can read the
  // draft as it is right after a change (see WorkoutSource).
  const draftRef = useRef(initialDraft);
  const [draft, setDraft] = useState(initialDraft);
  const [details, setDetails] = useState(initialDetails);
  const [minutes, setMinutes] = useState(
    initialDetails.durationS === null ? '' : String(Math.round(initialDetails.durationS / 60)),
  );
  const save = useSaveWorkout();

  function update(change: (workout: ActiveWorkout) => ActiveWorkout) {
    draftRef.current = change(draftRef.current);
    setDraft(draftRef.current);
  }
  const changes = useWorkoutChanges(draft, { update, current: () => draftRef.current });
  // A new one starts from last time, as a workout does.
  useLastTime(draft, update);

  function changeDetails(change: Partial<DraftDetails>) {
    setDetails((current) => ({ ...current, ...change }));
  }

  function submit() {
    const workout = toPastWorkout(
      draftRef.current,
      { ...details, durationS: readMinutes(minutes) },
      original,
    );
    save.mutate(workout, { onSuccess: onClose });
  }

  return (
    <View style={styles.page}>
      <DayStepper
        date={details.date}
        latest={dateKey(today)}
        onChange={(date) => changeDetails({ date })}
      />
      <NumberInput
        label={t('history.duration')}
        value={minutes}
        onChangeText={setMinutes}
        maxLength={4}
        style={styles.minutes}
      />

      {draft.exercises.length === 0 ? (
        <Text color="textMuted">{t('history.noExercises')}</Text>
      ) : null}
      {draft.exercises.map((exercise) => (
        <WorkoutExerciseCard
          key={exercise.id}
          exercise={exercise}
          nextSetId={null}
          onType={(setId, change) =>
            update((current) => updateTyped(current, exercise.id, setId, change))
          }
          onToggle={(setId) =>
            update((current) =>
              toggleSet(current, exercise.id, setId, doneAt(draft.date, original?.endedAt)),
            )
          }
          onInfo={() => changes.openInfo(exercise)}
              onMenu={() => changes.openExerciseMenu(exercise)}
          onSetMenu={(setId) => changes.openSetMenu(exercise, setId)}
          onAddSet={() => changes.addSet(exercise)}
          onNotesChange={(notes) => changes.setNotes(exercise, notes)}
          onSaveNoteToRoutine={
            exercise.routineExerciseId ? () => changes.saveNote(exercise) : undefined
          }
        />
      ))}
      <Button
        label={t('workout.addExercises')}
        variant="secondary"
        onPress={changes.openAddPicker}
      />

      <FeelingSlider value={details.feeling} onChange={(feeling) => changeDetails({ feeling })} />
      <TextField
        label={t('workout.summary.notes')}
        placeholder={t('workout.summary.notesPlaceholder')}
        value={details.notes}
        onChangeText={(notes) => changeDetails({ notes })}
        multiline
        maxLength={SESSION_NOTES_MAX_LENGTH}
        style={styles.notes}
      />

      <View style={styles.footer}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={onClose}
          style={styles.footerButton}
        />
        <Button
          label={t('history.save')}
          onPress={submit}
          disabled={save.isPending}
          style={styles.footerButton}
        />
      </View>

      <ExercisePicker
        visible={changes.picker !== null}
        single={changes.picker?.swapId != null}
        onClose={changes.closePicker}
        onAdd={changes.pickerDone}
        onDismissed={changes.onPickerDismissed}
      />
      <ExerciseInfoSheet exercise={changes.info?.exercise ?? null} onClose={changes.closeInfo} />
      <ReorderExercisesSheet
        visible={changes.reordering}
        items={draft.exercises}
        keyOf={(exercise) => exercise.id}
        exerciseOf={(exercise) => exercise.exercise}
        drop={dropWorkoutExercise}
        onClose={changes.closeReorder}
        onDone={changes.reorderDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  minutes: {
    alignSelf: 'flex-start',
    width: 120,
  },
  notes: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
