import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, SegmentedControl, Text, TextField } from '@/components/ui';
import type { Exercise } from '@/features/exercises/exercise';
import { ExercisePicker } from '@/features/exercises/ExercisePicker';
import { APP_DEFAULT_REST_S } from '@/features/exercises/rest';
import { useExerciseSettings } from '@/features/exercises/useExerciseSettings';
import { useExercises } from '@/features/exercises/useExercises';
import { isNetworkError } from '@/lib/errors';
import { spacing, useTheme } from '@/theme';

import { ROUTINE_LABELS, ROUTINE_NAME_MAX_LENGTH, type Routine } from './routine';
import { RoutineExerciseCard } from './RoutineExerciseCard';
import {
  addExercises,
  draftFromRoutine,
  emptyRoutineDraft,
  hasChanges,
  moveExercise,
  removeExercise,
  setPlannedSets,
  setRest,
  toSaveInput,
  validateRoutineDraft,
  type RoutineDraftErrors,
} from './routineDraft';
import { useRoutines, useSaveRoutine } from './useRoutines';

type RoutineEditorProps = {
  // Null for a new routine.
  routineId: string | null;
  onSaved: () => void;
};

// Create or edit a routine (US-07, US-10). Waits for the routine to load,
// then edits a draft that is only saved with "Desa la rutina".
export function RoutineEditor({ routineId, onSaved }: RoutineEditorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data: routines, isPending } = useRoutines();

  if (routineId === null) return <RoutineForm routine={null} onSaved={onSaved} />;
  if (isPending) return <ActivityIndicator color={colors.accent} />;
  const routine = routines?.find((r) => r.id === routineId);
  if (!routine) return <Text color="textMuted">{t('routines.editor.notFound')}</Text>;
  return <RoutineForm routine={routine} onSaved={onSaved} />;
}

function RoutineForm({ routine, onSaved }: { routine: Routine | null; onSaved: () => void }) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const navigation = useNavigation();
  const save = useSaveRoutine();
  // What's saved now; the draft is compared with it to spot changes.
  const [saved] = useState(() => (routine ? draftFromRoutine(routine) : emptyRoutineDraft()));
  const [draft, setDraft] = useState(saved);
  const [errors, setErrors] = useState<RoutineDraftErrors>({});
  // Set just before leaving after a save, so leaving isn't questioned.
  const leavingAfterSave = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const labelOptions = ROUTINE_LABELS.map((label) => ({
    value: label,
    label: t(`routines.labels.${label}`),
  }));

  return (
    <View style={styles.form}>
      <TextField
        label={t('routines.editor.name')}
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

      <View style={styles.section}>
        <Text variant="caption" color="textMuted">
          {t('routines.editor.label')}
        </Text>
        <SegmentedControl
          label={t('routines.editor.label')}
          options={labelOptions}
          value={draft.label}
          onChange={(label) => setDraft((current) => ({ ...current, label }))}
        />
      </View>

      <View style={styles.section}>
        <Text variant="caption" color="textMuted">
          {t('routines.editor.exercises')}
        </Text>
        {draft.exercises.length === 0 ? (
          <Text color="textMuted">{t('routines.editor.noExercises')}</Text>
        ) : (
          draft.exercises.map((item, index) => (
            <RoutineExerciseCard
              key={item.key}
              item={item}
              exercise={exercisesById.get(item.exerciseId)}
              exerciseRestS={exerciseRest(item.exerciseId)}
              isFirst={index === 0}
              isLast={index === draft.exercises.length - 1}
              onSetsChange={(sets) => setDraft((current) => setPlannedSets(current, item.key, sets))}
              onRestChange={(restS) => setDraft((current) => setRest(current, item.key, restS))}
              onMove={(direction) =>
                setDraft((current) => moveExercise(current, item.key, direction))
              }
              onRemove={() => setDraft((current) => removeExercise(current, item.key))}
            />
          ))
        )}
        <Button
          label={t('routines.editor.addExercises')}
          variant="secondary"
          onPress={() => setPickerOpen(true)}
        />
      </View>

      <TextField
        label={t('routines.editor.notes')}
        value={draft.notes}
        onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))}
        multiline
        maxLength={1000}
        style={styles.notes}
      />

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

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={(exerciseIds) => {
          setDraft((current) => addExercises(current, exerciseIds));
          setPickerOpen(false);
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
  notes: {
    minHeight: 72,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
});
