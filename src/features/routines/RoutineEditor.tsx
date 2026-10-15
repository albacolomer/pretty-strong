import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, SegmentedControl, Text, TextField } from '@/components/ui';
import { isNetworkError } from '@/lib/errors';
import { spacing, useTheme } from '@/theme';

import { ROUTINE_LABELS, ROUTINE_NAME_MAX_LENGTH, type Routine } from './routine';
import {
  draftFromRoutine,
  emptyRoutineDraft,
  hasChanges,
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
