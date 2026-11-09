import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  SectionHeader,
  SegmentedControl,
  SettingsCard,
  SettingsRow,
  Sheet,
  Text,
  TextSheet,
} from '@/components/ui';
import { spacing, useTheme } from '@/theme';

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

type OpenSheet = 'notes' | 'rest';

// Your layer on an exercise (US-05): your notes and your default rest, each
// a row that opens its sheet.
export function ExerciseSettingsEditor({ exerciseId }: { exerciseId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { data, isPending, isError } = useExerciseSettings();
  const save = useSaveExerciseSettings(exerciseId);
  const settings = data?.[exerciseId] ?? NO_SETTINGS;
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);
  const close = () => setOpenSheet(null);

  // Don't show (or let anyone change) values until your saved ones are here:
  // +15 s must start from your saved rest, not the app default.
  if (isPending) return <ActivityIndicator color={colors.accent} />;
  if (isError) return <Text color="danger">{t('exercises.detail.settingsLoadError')}</Text>;

  return (
    <View style={styles.section}>
      <SectionHeader title={t('exercises.detail.yours')} />
      <SettingsCard>
        <SettingsRow
          icon="note.text"
          label={t('exercises.detail.notes')}
          value={settings.notes?.split('\n')[0]}
          action={settings.notes ? undefined : t('exercises.detail.addNotes')}
          onPress={() => setOpenSheet('notes')}
        />
        <SettingsRow
          icon="timer"
          label={t('exercises.detail.defaultRest')}
          value={formatRest(settings.defaultRestS ?? APP_DEFAULT_REST_S)}
          onPress={() => setOpenSheet('rest')}
        />
      </SettingsCard>

      <TextSheet
        visible={openSheet === 'notes'}
        title={t('exercises.detail.notes')}
        label={t('exercises.detail.notes')}
        placeholder={t('exercises.detail.notesPlaceholder')}
        value={settings.notes ?? ''}
        maxLength={NOTES_MAX_LENGTH}
        onClose={close}
        onDone={(text) => {
          const notes = cleanNotes(text);
          if (notes !== settings.notes) save.mutate({ notes });
          close();
        }}
      />
      <RestSheet
        visible={openSheet === 'rest'}
        rest={settings.defaultRestS}
        onChange={(defaultRestS) => save.mutate({ defaultRestS })}
        onClose={close}
      />
    </View>
  );
}

type RestSheetProps = {
  visible: boolean;
  // Your default rest; null when you use the app's.
  rest: number | null;
  onChange: (seconds: number | null) => void;
  onClose: () => void;
};

// Each change is saved straight away, so there's only Fet.
function RestSheet({ visible, rest, onChange, onClose }: RestSheetProps) {
  const { t } = useTranslation();
  const shownRest = formatRest(rest ?? APP_DEFAULT_REST_S);
  const presetOptions = REST_PRESETS_S.map((seconds) => ({
    value: String(seconds),
    label: formatRest(seconds),
  }));

  return (
    <Sheet
      visible={visible}
      title={t('exercises.detail.defaultRest')}
      cancelLabel={t('common.done')}
      onCancel={onClose}>
      <View style={styles.rest}>
        <View style={styles.stepper}>
          <Button
            label={t('exercises.detail.restMinus')}
            variant="secondary"
            disabled={(rest ?? APP_DEFAULT_REST_S) <= 0}
            onPress={() => onChange(adjustRest(rest, -REST_STEP_S))}
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
            onPress={() => onChange(adjustRest(rest, REST_STEP_S))}
          />
        </View>
        <SegmentedControl
          label={t('exercises.detail.defaultRest')}
          options={presetOptions}
          // Not one of the presets (e.g. 1:45, or none): nothing is selected.
          value={String(rest)}
          onChange={(seconds) => onChange(Number(seconds))}
        />
        {rest === null ? (
          <Text variant="caption" color="textMuted">
            {t('exercises.detail.usingAppDefault', { time: formatRest(APP_DEFAULT_REST_S) })}
          </Text>
        ) : (
          <Button
            label={t('exercises.detail.useAppDefault')}
            variant="ghost"
            onPress={() => onChange(null)}
          />
        )}
      </View>
    </Sheet>
  );
}

// Empty notes are stored as "no notes".
function cleanNotes(text: string): string | null {
  const trimmed = text.trim();
  return trimmed === '' ? null : trimmed;
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  rest: {
    gap: spacing.md,
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
