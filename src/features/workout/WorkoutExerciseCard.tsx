import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text, TextField } from '@/components/ui';
import { exerciseName } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { AddNoteButton } from '@/features/routines/ExerciseNoteField';
import { EXERCISE_NOTES_MAX_LENGTH } from '@/features/routines/routine';
import type { TargetsUpdate } from '@/features/routines/TargetFields';
import { useAppLanguage } from '@/lib/i18n';
import { spacing } from '@/theme';

import { shownNumbers, type ActiveExercise } from './activeWorkout';
import { formatPace, pace, workoutInputs } from './cardio';
import { compareToLastTime } from './compareToLastTime';
import { ROW_MAX_INPUTS, SET_INPUT_WIDTH, SetRow } from './SetRow';
import { useExerciseTitle } from './useExerciseTitle';
import { VsLastTimeBadge } from './VsLastTimeBadge';

type WorkoutExerciseCardProps = {
  exercise: ActiveExercise;
  // The workout's next set to do, outlined.
  nextSetId: string | null;
  onType: (setId: string, update: TargetsUpdate) => void;
  onToggle: (setId: string) => void;
  // The exercise's ⋯ menu, and a set's menu (tap its number).
  onMenu: () => void;
  onSetMenu: (setId: string) => void;
  onAddSet: () => void;
  onNotesChange: (notes: string) => void;
  // Copies this workout's note into the routine; left out when the
  // exercise isn't from the routine.
  onSaveNoteToRoutine?: () => void;
};

// One exercise in the workout (spec: ExerciseCard): picture, name and ⋯;
// the routine's note on it; a row per set; then "+ Afegeix una sèrie" and
// "+ Nota". A skipped exercise shows why, without its sets. A cardio
// machine's rows are segments; a run's show their pace (US-19).
export function WorkoutExerciseCard({
  exercise,
  nextSetId,
  onType,
  onToggle,
  onMenu,
  onSetMenu,
  onAddSet,
  onNotesChange,
  onSaveNoteToRoutine,
}: WorkoutExerciseCardProps) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const titleOf = useExerciseTitle();
  const name = titleOf(exercise);
  const inputs = workoutInputs(exercise);
  const segment = exercise.exercise.trackingType === 'cardio_machine';
  const run = exercise.exercise.trackingType === 'run';
  const skipped = exercise.change === 'skipped';
  const doneSets = exercise.sets.filter((set) => set.completedAt !== null);
  const done = doneSets.length;
  // This workout's note shows once asked for, or straight away if there's one.
  const [noteOpen, setNoteOpen] = useState(exercise.notes !== '');
  // Once all its sets are done: better, same or less than last time?
  const comparison =
    !skipped && done === exercise.sets.length && exercise.previous
      ? compareToLastTime(
          exercise.exercise.trackingType,
          doneSets.map(shownNumbers),
          exercise.previous,
        )
      : null;
  const reason = exercise.changeReason
    ? t(`workout.exerciseReasons.${exercise.changeReason}`)
    : null;

  return (
    <Card style={skipped && styles.skipped}>
      <View style={styles.titleRow}>
        <ExercisePicture exercise={exercise.exercise} size={40} />
        <Text variant="cardTitle" style={styles.name} accessibilityRole="header">
          {name}
        </Text>
        {comparison ? (
          <VsLastTimeBadge comparison={comparison} />
        ) : skipped ? null : (
          <Text variant="caption" color="textMuted">
            {t('workout.setsDone', { done, total: exercise.sets.length })}
          </Text>
        )}
        <MenuButton label={t('exercises.menu.label', { name })} onPress={onMenu} />
      </View>

      {skipped ? (
        <Text variant="bodyStrong" color="textMuted">
          {[t('workout.skipped'), reason].filter(Boolean).join(' · ')}
        </Text>
      ) : null}
      {exercise.replaced ? (
        <Text variant="caption" color="textMuted">
          {[t('workout.insteadOf', { name: exerciseName(exercise.replaced, language) }), reason]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      {exercise.routineNote ? (
        <Text variant="caption" color="textMuted">
          {exercise.routineNote}
        </Text>
      ) : null}

      {skipped ? null : (
        <>
          {inputs.length <= ROW_MAX_INPUTS ? (
            <View style={styles.header} aria-hidden>
              <Text variant="caption" color="textMuted" style={styles.numberColumn}>
                {segment ? t('workout.segments.header') : t('routines.sets.header')}
              </Text>
              {inputs.map((input) => (
                <Text key={input} variant="caption" color="textMuted" style={styles.inputColumn}>
                  {t(`routines.targets.inputs.${input}`)}
                </Text>
              ))}
            </View>
          ) : null}

          {exercise.sets.map((set, index) => {
            const setPace = run ? pace([shownNumbers(set)]) : null;
            return (
              <SetRow
                key={set.id}
                number={index + 1}
                inputs={inputs}
                set={set}
                isNext={set.id === nextSetId}
                exerciseName={name}
                onType={(update) => onType(set.id, update)}
                onToggle={() => onToggle(set.id)}
                onNumberPress={() => onSetMenu(set.id)}
                segment={segment}
                pace={setPace === null ? null : t('workout.pace', { pace: formatPace(setPace) })}
              />
            );
          })}

          <View style={styles.bottomRow}>
            <Button
              label={segment ? t('workout.segments.add') : t('routines.sets.add')}
              aria-label={
                segment ? t('workout.segments.addFor', { name }) : t('routines.sets.addFor', { name })
              }
              variant="ghost"
              onPress={onAddSet}
              style={styles.bottomButton}
            />
            {noteOpen ? null : <AddNoteButton name={name} onPress={() => setNoteOpen(true)} />}
          </View>

          {noteOpen ? (
            <View style={styles.note}>
              <TextField
                label={t('workout.todaysNote')}
                aria-label={t('workout.todaysNoteFor', { name })}
                placeholder={t('routines.editor.exerciseNotesPlaceholder')}
                value={exercise.notes}
                onChangeText={onNotesChange}
                autoFocus={exercise.notes === ''}
                multiline
                maxLength={EXERCISE_NOTES_MAX_LENGTH}
                style={styles.noteInput}
              />
              {onSaveNoteToRoutine && exercise.notes.trim() !== '' ? (
                <Button
                  label={t('workout.saveNoteToRoutine')}
                  variant="ghost"
                  onPress={onSaveNoteToRoutine}
                  style={styles.bottomButton}
                />
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  skipped: {
    opacity: 0.6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  numberColumn: {
    width: 28,
    textAlign: 'center',
  },
  inputColumn: {
    width: SET_INPUT_WIDTH,
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  note: {
    gap: spacing.xs,
  },
  noteInput: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
