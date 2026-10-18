import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Text, TextField, useToast } from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicker } from '@/features/exercises/ExercisePicker';
import { APP_DEFAULT_REST_S } from '@/features/exercises/rest';
import { useExerciseSettings } from '@/features/exercises/useExerciseSettings';
import { useExercises } from '@/features/exercises/useExercises';
import { isNetworkError } from '@/lib/errors';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import {
  CUSTOM_LABEL_MAX_LENGTH,
  ROUTINE_NAME_MAX_LENGTH,
  usesExercises,
  usesPlannedDuration,
  type Routine,
  type RoutineLabel,
} from './routine';
import { ExerciseGroup } from './ExerciseGroup';
import { PlannedDurationField } from './PlannedDurationField';
import { ReorderExercisesSheet } from './ReorderExercisesSheet';
import { RoutineExerciseCard, type GroupKind } from './RoutineExerciseCard';
import { RoutineTypeButton } from './RoutineTypeButton';
import { RunBlockCard } from './RunBlockCard';
import { RUN_BLOCK_KINDS, RUN_EXERCISE_SLUG, runBlockSummary, type RunBlockKind } from './runBlocks';
import {
  addExercises,
  addRunBlock,
  addSet,
  blockKindOf,
  draftFromRoutine,
  emptyRoutineDraft,
  exerciseSegments,
  hasChanges,
  leaveSuperset,
  makeSuperset,
  removeExercise,
  removeSet,
  setExerciseNotes,
  setLabel,
  setPlannedDuration,
  setRepetitions,
  setRest,
  toggleWeekday,
  toSaveInput,
  updateBlockTargets,
  updateSetTargets,
  validateRoutineDraft,
  type DraftExercise,
  type RoutineDraftErrors,
} from './routineDraft';
import { useArchiveRoutineWithUndo } from './useArchiveRoutine';
import { useRoutines, useSaveRoutine } from './useRoutines';
import { WeekdayPicker } from './WeekdayPicker';

type RoutineEditorProps = {
  // Null for a new routine.
  routineId: string | null;
  onSaved: () => void;
  // Given for a saved routine: offers "Arxiva la rutina", then leaves.
  onArchived?: () => void;
};

// Create or edit a routine (US-07, US-10). Waits for the routine to load,
// then edits a draft that is only saved with "Desa la rutina".
export function RoutineEditor({ routineId, onSaved, onArchived }: RoutineEditorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: routines, isPending } = useRoutines();

  if (routineId === null) return <RoutineForm routine={null} onSaved={onSaved} />;
  if (isPending) return <ActivityIndicator color={colors.accent} />;
  const routine = routines?.find((r) => r.id === routineId);
  if (!routine) return <Text color="textMuted">{t('routines.editor.notFound')}</Text>;
  return <RoutineForm routine={routine} onSaved={onSaved} onArchived={onArchived} />;
}

type RoutineFormProps = Omit<RoutineEditorProps, 'routineId'> & { routine: Routine | null };

function RoutineForm({ routine, onSaved, onArchived }: RoutineFormProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const language = useAppLanguage();
  const navigation = useNavigation();
  const showToast = useToast();
  const save = useSaveRoutine();
  const archiveRoutine = useArchiveRoutineWithUndo();
  // What's saved now; the draft is compared with it to spot changes.
  const [saved] = useState(() => (routine ? draftFromRoutine(routine) : emptyRoutineDraft()));
  const [draft, setDraft] = useState(saved);
  const [errors, setErrors] = useState<RoutineDraftErrors>({});
  // Set just before leaving after a save or archive, so leaving isn't
  // questioned.
  const leavingAfterSave = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  // The routine's note shows once asked for, or straight away if it has one.
  const [notesOpen, setNotesOpen] = useState(draft.notes !== '');
  const { data: library = [] } = useExercises();
  const { data: settings } = useExerciseSettings();

  // Exercises by id: the library, plus the routine's own (which may have
  // been archived since and so aren't in the library).
  const exercisesById = new Map<string, Exercise>(
    [...library, ...(routine?.exercises.map((item) => item.exercise) ?? [])].map((exercise) => [
      exercise.id,
      exercise,
    ]),
  );
  const exerciseRest = (exerciseId: string) =>
    settings?.[exerciseId]?.defaultRestS ?? APP_DEFAULT_REST_S;
  const isRunExercise = (exerciseId: string) =>
    exercisesById.get(exerciseId)?.trackingType === 'run';
  // Run blocks are made of the built-in run exercise.
  const runExerciseId = library.find((exercise) => exercise.slug === RUN_EXERCISE_SLUG)?.id;
  // In each card's ⋯ menu; reordering only makes sense with two or more.
  const openReorder = draft.exercises.length > 1 ? () => setReorderOpen(true) : undefined;

  function renderCard(item: DraftExercise, group: GroupKind | null) {
    // Any exercise outside this one's own group.
    const supersetOptions = draft.exercises
      .filter(
        (other) =>
          other.key !== item.key && (item.groupKey === null || other.groupKey !== item.groupKey),
      )
      .map((other) => {
        const exercise = exercisesById.get(other.exerciseId);
        return { key: other.key, name: exercise ? exerciseName(exercise, language) : '…' };
      });

    return (
      <RoutineExerciseCard
        key={item.key}
        item={item}
        exercise={exercisesById.get(item.exerciseId)}
        exerciseRestS={exerciseRest(item.exerciseId)}
        group={group}
        supersetOptions={supersetOptions}
        onReorder={openReorder}
        onAddSet={() => setDraft((current) => addSet(current, item.key))}
        onRemoveSet={(setKey) => setDraft((current) => removeSet(current, item.key, setKey))}
        onSetTargetsChange={(setKey, update) =>
          setDraft((current) => updateSetTargets(current, item.key, setKey, update))
        }
        onRestChange={(restS) => setDraft((current) => setRest(current, item.key, restS))}
        onNotesChange={(notes) => setDraft((current) => setExerciseNotes(current, item.key, notes))}
        onMakeSuperset={(otherKey) =>
          setDraft((current) => makeSuperset(current, item.key, otherKey))
        }
        onLeaveGroup={() => setDraft((current) => leaveSuperset(current, item.key))}
        onRemove={() => setDraft((current) => removeExercise(current, item.key))}
      />
    );
  }

  // Losing unsaved work can't be undone, so this is the one place that asks.
  usePreventRemove(hasChanges(draft, saved), ({ data }) => {
    if (leavingAfterSave.current) {
      navigation.dispatch(data.action);
      return;
    }
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('routines.editor.discardTitle'),
        options: [t('routines.editor.discard'), t('routines.editor.keepEditing')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === 0) navigation.dispatch(data.action);
      },
    );
  });

  function handleSave() {
    const found = validateRoutineDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    save.mutate(toSaveInput(draft, routine?.id ?? null), {
      onSuccess: () => {
        leavingAfterSave.current = true;
        onSaved();
      },
    });
  }

  // Unsaved edits go with it: archiving can be undone, and the routine is
  // kept as it was last saved.
  function handleArchive() {
    if (!routine || !onArchived) return;
    archiveRoutine(routine);
    leavingAfterSave.current = true;
    onArchived();
  }

  // A class holds no exercises and a run only run blocks: switching takes
  // the others out, with undo instead of "Are you sure?" (gym UX rule).
  function changeLabel(label: RoutineLabel) {
    const previous = draft;
    const next = setLabel(draft, label, isRunExercise);
    setDraft(next);
    const removed = previous.exercises.length - next.exercises.length;
    if (removed === 0 || (label !== 'class' && label !== 'run')) return;
    showToast({
      message: t(`routines.editor.exercisesRemoved.${label}`, { count: removed }),
      action: {
        label: t('common.undo'),
        onPress: () =>
          setDraft((current) => ({
            ...current,
            label: previous.label,
            exercises: previous.exercises,
          })),
      },
    });
  }

  function chooseRunBlock() {
    if (!runExerciseId) return;
    const kinds: readonly RunBlockKind[] = RUN_BLOCK_KINDS;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: t('routines.blocks.add'),
        options: [...kinds.map((kind) => t(`routines.blocks.kinds.${kind}`)), t('common.cancel')],
        cancelButtonIndex: kinds.length,
        userInterfaceStyle: scheme,
      },
      (index) => {
        const kind = kinds[index];
        if (kind) setDraft((current) => addRunBlock(current, kind, runExerciseId));
      },
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.titleRow}>
        <View style={styles.name}>
          <TextField
            label={t('routines.editor.name')}
            labelHidden
            placeholder={t('routines.editor.namePlaceholder')}
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            error={
              errors.name
                ? t(`routines.editor.errors.${errors.name}`, { max: ROUTINE_NAME_MAX_LENGTH })
                : undefined
            }
            maxLength={ROUTINE_NAME_MAX_LENGTH}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        </View>
        <RoutineTypeButton value={draft.label} onChange={changeLabel} />
      </View>

      {draft.label === 'custom' ? (
        <TextField
          label={t('routines.editor.customLabel')}
          placeholder={t('routines.editor.customLabelPlaceholder')}
          value={draft.customLabel}
          onChangeText={(customLabel) => setDraft((current) => ({ ...current, customLabel }))}
          maxLength={CUSTOM_LABEL_MAX_LENGTH}
          autoCapitalize="sentences"
          returnKeyType="done"
        />
      ) : null}

      {usesPlannedDuration(draft.label) ? (
        <PlannedDurationField
          value={draft.plannedDurationS}
          onChange={(seconds) => setDraft((current) => setPlannedDuration(current, seconds))}
        />
      ) : null}

      {draft.label === 'run' ? (
        <View style={styles.section}>
          <Text variant="caption" color="textMuted">
            {t('routines.blocks.hint')}
          </Text>
          {draft.exercises.map((block, index) => (
            <RunBlockCard
              key={block.key}
              block={block}
              kind={blockKindOf(block)}
              number={index + 1}
              showIncomplete={errors.blocks !== undefined}
              onReorder={openReorder}
              onRepetitionsChange={(count) =>
                setDraft((current) => setRepetitions(current, block.key, count))
              }
              onRecoveryChange={(restS) => setDraft((current) => setRest(current, block.key, restS))}
              onTargetsChange={(update) =>
                setDraft((current) => updateBlockTargets(current, block.key, update))
              }
              onNotesChange={(notes) =>
                setDraft((current) => setExerciseNotes(current, block.key, notes))
              }
              onRemove={() => setDraft((current) => removeExercise(current, block.key))}
            />
          ))}
          <Button
            label={t('routines.blocks.add')}
            variant="secondary"
            onPress={chooseRunBlock}
            disabled={!runExerciseId}
            style={styles.addButton}
          />
        </View>
      ) : null}

      {usesExercises(draft.label) && draft.label !== 'run' ? (
        <View style={styles.section}>
          {draft.label === 'hybrid' || draft.label === 'custom' ? (
            // Exercises are optional here: plan them, or log them on the day.
            <Text variant="caption" color="textMuted">
              {t(`routines.editor.exercisesOptional.${draft.label}`)}
            </Text>
          ) : null}
          {draft.exercises.length > 0 ? (
            <Text variant="caption" color="textMuted">
              {t('routines.targets.hint')}
            </Text>
          ) : null}
          {draft.exercises.length === 0 ? (
            draft.label === 'hybrid' || draft.label === 'custom' ? null : (
              <Text color="textMuted">{t('routines.editor.noExercises')}</Text>
            )
          ) : (
            exerciseSegments(draft.exercises).map(({ groupKey, items }) => {
              if (groupKey === null) return renderCard(items[0], null);
              const kind: GroupKind = items.length > 2 ? 'circuit' : 'superset';
              const [first] = items;
              return (
                <ExerciseGroup
                  key={groupKey}
                  kind={kind}
                  rounds={first.sets.length}
                  restS={first.restS}
                  exerciseRestS={exerciseRest(items[items.length - 1].exerciseId)}
                  onRestChange={(restS) => setDraft((current) => setRest(current, first.key, restS))}>
                  {items.map((item) => renderCard(item, kind))}
                </ExerciseGroup>
              );
            })
          )}
          <Button
            label={t('routines.editor.addExercises')}
            variant="secondary"
            onPress={() => setPickerOpen(true)}
            style={styles.addButton}
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="caption" color="textMuted">
          {t('routines.editor.weekdays')}
        </Text>
        <WeekdayPicker
          selected={draft.weekdays}
          onToggle={(day) => setDraft((current) => toggleWeekday(current, day))}
        />
      </View>

      {notesOpen ? (
        <TextField
          label={t('routines.editor.notes')}
          value={draft.notes}
          onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))}
          // Only when just asked for, not when the routine opens with a note.
          autoFocus={draft.notes === ''}
          multiline
          maxLength={1000}
          style={styles.notes}
        />
      ) : (
        <Button
          label={t('routines.editor.addNote')}
          variant="ghost"
          onPress={() => setNotesOpen(true)}
          style={styles.addNote}
        />
      )}

      {errors.blocks ? (
        <Text color="danger" role="alert">
          {t(`routines.editor.errors.${errors.blocks}`)}
        </Text>
      ) : null}

      {save.isError ? (
        <Text color="danger" role="alert">
          {isNetworkError(save.error)
            ? t('routines.editor.errors.network')
            : t('routines.editor.errors.unknown')}
        </Text>
      ) : null}

      <Button
        label={t('routines.editor.save')}
        onPress={handleSave}
        disabled={save.isPending}
      />

      {routine && onArchived ? (
        <Button label={t('routines.archiveRoutine')} variant="ghost" onPress={handleArchive} />
      ) : null}

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={(exerciseIds) => {
          setDraft((current) => addExercises(current, exerciseIds));
          setPickerOpen(false);
        }}
      />
      <ReorderExercisesSheet
        visible={reorderOpen}
        exercises={draft.exercises}
        exercisesById={exercisesById}
        // Blocks all show the run exercise: name them by what they are.
        labelFor={
          draft.label === 'run'
            ? (block) =>
                [
                  t(`routines.blocks.kinds.${blockKindOf(block)}`),
                  runBlockSummary(
                    blockKindOf(block),
                    block.sets.map((set) => set.targets),
                    language,
                  ),
                ]
                  .filter((part) => part !== '')
                  .join(' · ')
            : undefined
        }
        onClose={() => setReorderOpen(false)}
        onDone={(exercises) => {
          setDraft((current) => ({ ...current, exercises }));
          setReorderOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  // Name and type on one line; the type keeps to the input's height when
  // an error shows under the name.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  addButton: {
    alignSelf: 'center',
  },
  addNote: {
    alignSelf: 'flex-start',
  },
  notes: {
    minHeight: 72,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
});
