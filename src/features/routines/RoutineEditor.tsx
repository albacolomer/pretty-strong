import { router, Stack } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  HeaderBackButton,
  Text,
  TextField,
  useActionSheet,
  useToast,
} from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicker } from '@/features/exercises/ExercisePicker';
import { APP_DEFAULT_REST_S } from '@/features/exercises/rest';
import { useExerciseSettings } from '@/features/exercises/useExerciseSettings';
import { useExercises } from '@/features/exercises/useExercises';
import { isNetworkError } from '@/lib/errors';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, typography, useTheme } from '@/theme';

import {
  CUSTOM_LABEL_MAX_LENGTH,
  ROUTINE_DESCRIPTION_MAX_LENGTH,
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
import { ROUTINE_ICONS } from './routineIcons';
import { RoutineNoteSheet } from './RoutineNoteSheet';
import { EmptySectionCard, SectionHeader } from './RoutineSection';
import { RoutineTypeRow } from './RoutineTypeRow';
import { RunBlockCard } from './RunBlockCard';
import { RUN_BLOCK_KINDS, RUN_EXERCISE_SLUG, runBlockSummary, type RunBlockKind } from './runBlocks';
import {
  addExercises,
  addRunBlock,
  addSet,
  blockKindOf,
  draftFromRoutine,
  dropExercise,
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
import { SettingsCard, SettingsRow } from './SettingsRows';
import { WeekdayPicker } from './WeekdayPicker';

type RoutineEditorProps = {
  // Null for a new routine.
  routineId: string | null;
  // With the routine's id, new or not.
  onSaved: (routineId: string) => void;
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
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const language = useAppLanguage();
  const showToast = useToast();
  const save = useSaveRoutine();
  const archiveRoutine = useArchiveRoutineWithUndo();
  // What's saved now; the draft is compared with it to spot changes.
  const [saved] = useState(() => (routine ? draftFromRoutine(routine) : emptyRoutineDraft()));
  const [draft, setDraft] = useState(saved);
  const [errors, setErrors] = useState<RoutineDraftErrors>({});
  // Set once leaving is decided (saved, archived or discarded), so the
  // guard below stays off.
  const [leaving, setLeaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
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
  // The Nota row shows the note's first line.
  const notePreview = draft.notes.trim().split('\n')[0];
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
  // Leaving goes on with `repeat`, which turns the guard off first: sending
  // the same action again would be stopped again, over and over.
  const guarding = hasChanges(draft, saved) && !leaving;
  const stopGuarding = usePreventRemove(guarding, ({ repeat }) => {
    showActionSheet(
      {
        title: t('routines.editor.discardTitle'),
        options: [t('routines.editor.discard'), t('routines.editor.keepEditing')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index !== 0) return;
        setLeaving(true);
        repeat();
      },
    );
  });

  // Before going away on purpose: the guard is off at once, not only after
  // the next render.
  function leave() {
    setLeaving(true);
    stopGuarding();
  }

  function handleSave() {
    const found = validateRoutineDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    save.mutate(toSaveInput(draft, routine?.id ?? null), {
      onSuccess: (routineId) => {
        leave();
        onSaved(routineId);
      },
    });
  }

  // Unsaved edits go with it: archiving can be undone, and the routine is
  // kept as it was last saved.
  function handleArchive() {
    if (!routine || !onArchived) return;
    archiveRoutine(routine);
    leave();
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
    showActionSheet(
      {
        title: t('routines.blocks.add'),
        options: [...kinds.map((kind) => t(`routines.blocks.kinds.${kind}`)), t('common.cancel')],
        cancelButtonIndex: kinds.length,
      },
      (index) => {
        const kind = kinds[index];
        if (kind) setDraft((current) => addRunBlock(current, kind, runExerciseId));
      },
    );
  }

  return (
    <View style={styles.form}>
      <Stack.Screen
        options={{
          // Our own ‹, so asking before leaving never goes through iOS
          // closing the screen first (see HeaderBackButton).
          headerBackVisible: false,
          headerLeft: () => <HeaderBackButton onPress={() => router.back()} />,
          // Swiping back closes it natively too: off while there's
          // something to lose.
          gestureEnabled: !guarding,
        }}
      />
      <Card style={styles.nameCard}>
        <TextField
          label={t('routines.editor.name')}
          labelHidden
          variant="plain"
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
          style={styles.nameInput}
        />
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        <TextField
          label={t('routines.editor.description')}
          labelHidden
          variant="plain"
          placeholder={t('routines.editor.descriptionPlaceholder')}
          value={draft.description}
          onChangeText={(description) => setDraft((current) => ({ ...current, description }))}
          maxLength={ROUTINE_DESCRIPTION_MAX_LENGTH}
          autoCapitalize="sentences"
          returnKeyType="done"
        />
      </Card>

      <SettingsCard>
        <RoutineTypeRow value={draft.label} onChange={changeLabel} />
        {draft.label === 'custom' ? (
          <SettingsRow icon="tag" label={t('routines.editor.customLabel')}>
            <TextField
              label={t('routines.editor.customLabel')}
              labelHidden
              placeholder={t('routines.editor.customLabelPlaceholder')}
              value={draft.customLabel}
              onChangeText={(customLabel) => setDraft((current) => ({ ...current, customLabel }))}
              maxLength={CUSTOM_LABEL_MAX_LENGTH}
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </SettingsRow>
        ) : null}
        {usesPlannedDuration(draft.label) ? (
          <PlannedDurationField
            value={draft.plannedDurationS}
            onChange={(seconds) => setDraft((current) => setPlannedDuration(current, seconds))}
          />
        ) : null}
        <SettingsRow
          icon="calendar"
          label={t('routines.editor.days')}
          optional={draft.weekdays.length === 0}>
          <WeekdayPicker
            selected={draft.weekdays}
            onToggle={(day) => setDraft((current) => toggleWeekday(current, day))}
          />
        </SettingsRow>
        <SettingsRow
          icon="pencil"
          label={t('routines.editor.note')}
          value={notePreview}
          optional
          onPress={() => setNoteOpen(true)}
          aria-label={
            notePreview
              ? t('routines.editor.editNote', { note: notePreview })
              : t('routines.editor.addNote')
          }
        />
      </SettingsCard>

      {draft.label === 'run' ? (
        <View style={styles.section}>
          <SectionHeader
            title={t('routines.blocks.heading')}
            count={t('routines.editor.added', { count: draft.exercises.length })}
          />
          {draft.exercises.length === 0 ? (
            <EmptySectionCard
              icon={ROUTINE_ICONS.run}
              title={t('routines.blocks.empty')}
              hint={t('routines.blocks.hint')}
              actionLabel={t('routines.blocks.add')}
              onAction={chooseRunBlock}
              actionDisabled={!runExerciseId}
            />
          ) : (
            <>
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
                  onRecoveryChange={(restS) =>
                    setDraft((current) => setRest(current, block.key, restS))
                  }
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
                icon="plus"
                variant="secondary"
                onPress={chooseRunBlock}
                disabled={!runExerciseId}
                style={styles.addButton}
              />
            </>
          )}
        </View>
      ) : null}

      {usesExercises(draft.label) && draft.label !== 'run' ? (
        <View style={styles.section}>
          <SectionHeader
            title={t('routines.editor.exercisesHeading')}
            count={t('routines.editor.added', { count: draft.exercises.length })}
          />
          {draft.exercises.length === 0 ? (
            <EmptySectionCard
              icon={ROUTINE_ICONS.strength}
              title={t('routines.editor.noExercisesTitle')}
              hint={
                // Exercises are optional here: plan them, or log them on the day.
                draft.label === 'hybrid' || draft.label === 'custom'
                  ? t(`routines.editor.exercisesOptional.${draft.label}`)
                  : t('routines.editor.noExercisesHint')
              }
              actionLabel={t('routines.editor.addExercises')}
              onAction={() => setPickerOpen(true)}
            />
          ) : (
            <>
              <Text variant="caption" color="textMuted">
                {t('routines.targets.hint')}
              </Text>
              {exerciseSegments(draft.exercises).map(({ groupKey, items }) => {
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
                    onRestChange={(restS) =>
                      setDraft((current) => setRest(current, first.key, restS))
                    }>
                    {items.map((item) => renderCard(item, kind))}
                  </ExerciseGroup>
                );
              })}
              <Button
                label={t('routines.editor.addExercises')}
                icon="plus"
                variant="secondary"
                onPress={() => setPickerOpen(true)}
                style={styles.addButton}
              />
            </>
          )}
        </View>
      ) : null}

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

      <RoutineNoteSheet
        visible={noteOpen}
        note={draft.notes}
        onClose={() => setNoteOpen(false)}
        onDone={(notes) => {
          setDraft((current) => ({ ...current, notes }));
          setNoteOpen(false);
        }}
      />
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
        items={draft.exercises}
        keyOf={(item) => item.key}
        exerciseOf={(item) => exercisesById.get(item.exerciseId)}
        drop={dropExercise}
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
  // The name, a line, then the description, on one card.
  nameCard: {
    gap: 0,
    paddingVertical: spacing.xs,
  },
  // Only the font and size: a lineHeight would push the text off-centre
  // in iOS inputs.
  nameInput: {
    fontFamily: typography.cardTitle.fontFamily,
    fontSize: typography.cardTitle.fontSize,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  addButton: {
    alignSelf: 'center',
  },
});
