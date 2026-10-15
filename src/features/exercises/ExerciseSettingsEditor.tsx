import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, SegmentedControl, Text, TextField } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

import type { ExerciseSettingsChange } from './api';
import {
  adjustRest,
  APP_DEFAULT_REST_S,
  formatRest,
  REST_MAX_S,
  REST_PRESETS_S,
  REST_STEP_S,
} from './rest';
import { NO_SETTINGS, useExerciseSettings, useSaveExerciseSettings } from './useExerciseSettings';

const NOTES_MAX_LENGTH = 1000;

type Field = 'notes' | 'rest';

// Your notes and default rest on an exercise (US-05). Saves automatically:
// notes when you leave the field (or the screen), the rest on every change.
export function ExerciseSettingsEditor({ exerciseId }: { exerciseId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data, isPending, isError } = useExerciseSettings();
  const save = useSaveExerciseSettings(exerciseId);
  const settings = data?.[exerciseId] ?? NO_SETTINGS;
  // What's being typed, until it's saved; null when nothing is pending.
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Field | null>(null);

  // If the screen closes while you're still typing, save what's there.
  // Refs, because the clean-up below only runs once, at the very end.
  const pendingNotes = useRef<string | null>(null);
  const saveOnClose = useRef(save.mutate);
  useEffect(() => {
    saveOnClose.current = save.mutate;
  });
  useEffect(
    () => () => {
      if (pendingNotes.current !== null) saveOnClose.current({ notes: cleanNotes(pendingNotes.current) });
    },
    [],
  );

  function saveChange(field: Field, change: ExerciseSettingsChange) {
    setLastSaved(null);
    save.mutate(change, { onSuccess: () => setLastSaved(field) });
  }

  function saveNotes() {
    if (notesDraft === null) return;
    const notes = cleanNotes(notesDraft);
    setNotesDraft(null);
    pendingNotes.current = null;
    if (notes !== settings.notes) saveChange('notes', { notes });
  }

  // Don't show (or let anyone change) values until your saved ones are here:
  // +15 s must start from your saved rest, not the app default.
  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.detail.settingsLoadError')}</Text>;

  const rest = settings.defaultRestS;
  const shownRest = formatRest(rest ?? APP_DEFAULT_REST_S);
  const presetOptions = REST_PRESETS_S.map((seconds) => ({
    value: String(seconds),
    label: formatRest(seconds),
  }));

  return (
    <View style={styles.editor}>
      <View style={styles.section}>
        <TextField
          label={t('exercises.detail.notes')}
          placeholder={t('exercises.detail.notesPlaceholder')}
          value={notesDraft ?? settings.notes ?? ''}
          onChangeText={(text) => {
            setNotesDraft(text);
            pendingNotes.current = text;
          }}
          onBlur={saveNotes}
          multiline
          maxLength={NOTES_MAX_LENGTH}
          style={styles.notes}
        />
        {lastSaved === 'notes' ? <SavedLabel /> : null}
      </View>

      <View style={styles.section}>
        <Text variant="caption" color="textMuted">
          {t('exercises.detail.defaultRest')}
        </Text>
        <View style={styles.stepper}>
          <Button
            label={t('exercises.detail.restMinus')}
            variant="secondary"
            disabled={(rest ?? APP_DEFAULT_REST_S) <= 0}
            onPress={() => saveChange('rest', { defaultRestS: adjustRest(rest, -REST_STEP_S) })}
          />
          <Text
            variant="timer"
            color={rest === null ? 'textMuted' : 'text'}
            aria-label={t('exercises.detail.restValue', { time: shownRest })}
            style={styles.time}>
            {shownRest}
          </Text>
          <Button
            label={t('exercises.detail.restPlus')}
            variant="secondary"
            disabled={(rest ?? APP_DEFAULT_REST_S) >= REST_MAX_S}
            onPress={() => saveChange('rest', { defaultRestS: adjustRest(rest, REST_STEP_S) })}
          />
        </View>
        <SegmentedControl
          label={t('exercises.detail.defaultRest')}
          options={presetOptions}
          // Not one of the presets (e.g. 1:45, or none): nothing is selected.
          value={String(rest)}
          onChange={(seconds) => saveChange('rest', { defaultRestS: Number(seconds) })}
        />
        {rest === null ? (
          <Text variant="caption" color="textMuted">
            {t('exercises.detail.usingAppDefault', { time: formatRest(APP_DEFAULT_REST_S) })}
          </Text>
        ) : (
          <Button
            label={t('exercises.detail.useAppDefault')}
            variant="ghost"
            onPress={() => saveChange('rest', { defaultRestS: null })}
          />
        )}
        {lastSaved === 'rest' ? <SavedLabel /> : null}
      </View>
    </View>
  );
}

// Empty notes are stored as "no notes".
function cleanNotes(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

function SavedLabel() {
  const { t } = useTranslation();
  return (
    <Text variant="caption" color="textMuted">
      {t('exercises.detail.saved')}
    </Text>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  notes: {
    minHeight: 96,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    textAlignVertical: 'top',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  time: {
    flex: 1,
    textAlign: 'center',
  },
});
