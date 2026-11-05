import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import {
  Button,
  Card,
  SectionHeader,
  SettingsCard,
  SettingsRow,
  Text,
  TextField,
  TextSheet,
  useActionSheet,
} from '@/components/ui';
import { spacing, typography, useTheme } from '@/theme';

import type { Exercise } from './exercise';
import {
  draftFromExercise,
  emptyDraft,
  EXERCISE_NAME_MAX_LENGTH,
  linkHost,
  needsMuscles,
  readVideoUrl,
  saveErrorReason,
  toggleSecondaryMuscle,
  togglePrimaryMuscle,
  validateDraft,
  type DraftErrors,
  type DraftFieldError,
  type SaveErrorReason,
} from './exerciseDraft';
import { OptionSheet } from './OptionSheet';
import { useCreateExercise } from './useCreateExercise';
import { useExerciseSettings, useSaveExerciseNotes } from './useExerciseSettings';
import { useUpdateExercise } from './useUpdateExercise';
import { useEquipmentGroups, useMuscleGroups } from './useSheetOptions';
import { TRACKING_TYPES, type Muscle, type TrackingType } from './vocabulary';

type Sheet = 'primary' | 'secondary' | 'equipment' | 'video' | 'note';

// Each tracking type's icon (SF Symbols), on the "Què registres" row.
const TRACKING_ICONS: Record<TrackingType, SFSymbol> = {
  weight_reps: 'dumbbell',
  bodyweight_reps: 'figure.strengthtraining.functional',
  duration: 'timer',
  weight_distance: 'figure.walk',
  cardio_machine: 'figure.indoor.cycle',
  run: 'figure.run',
};

const NOTES_MAX_LENGTH = 1000;

type ExerciseFormProps = {
  // Pre-filled from the library search, e.g. "Hip thrust unilateral".
  initialName?: string;
  // Given when editing one of your exercises; otherwise a new one is created.
  exercise?: Exercise;
  onSaved: (exercise: Exercise) => void;
};

// Create a custom exercise (US-04), or edit one of yours (US-05): its
// name, what you log, muscles and equipment, then a technique video and
// your note.
export function ExerciseForm({ initialName = '', exercise, onSaved }: ExerciseFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const [draft, setDraft] = useState(() =>
    exercise ? draftFromExercise(exercise) : emptyDraft(initialName),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise(exercise?.id ?? '');
  const save = exercise ? updateExercise : createExercise;
  const saveNotes = useSaveExerciseNotes();
  const { data: settings } = useExerciseSettings();
  // Your note lives with your settings, not on the exercise; null until
  // it's changed here.
  const savedNote = (exercise && settings?.[exercise.id]?.notes) ?? '';
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const note = noteDraft ?? savedNote;
  const muscleGroups = useMuscleGroups();
  // A muscle that is already a main one can't also be secondary.
  const secondaryGroups = useMuscleGroups((muscle) => !draft.primaryMuscles.includes(muscle));
  const equipmentGroups = useEquipmentGroups();

  const saveError = save.isError ? saveErrorReason(save.error) : null;
  const errorText = (key: DraftFieldError | SaveErrorReason | undefined) =>
    key ? t(`exercises.form.errors.${key}`, { max: EXERCISE_NAME_MAX_LENGTH }) : undefined;
  // Cardio and runs can skip muscles; the row says so.
  const musclesRequired = needsMuscles(draft.trackingType);
  const trackingLabel = t(`trackingTypes.${draft.trackingType}.label`);
  const muscleNames = (muscles: readonly Muscle[]) =>
    muscles.map((muscle) => t(`muscles.${muscle}`)).join(', ');

  function chooseTrackingType() {
    showActionSheet(
      {
        title: t('exercises.form.trackingType'),
        options: [...TRACKING_TYPES.map((type) => t(`trackingTypes.${type}.label`)), t('common.cancel')],
        cancelButtonIndex: TRACKING_TYPES.length,
      },
      (index) => {
        const trackingType = TRACKING_TYPES[index];
        if (trackingType) setDraft((current) => ({ ...current, trackingType }));
      },
    );
  }

  function handleSave() {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const videoUrl = readVideoUrl(draft.videoUrl);
    const cleanNote = note.trim() === '' ? null : note.trim();

    save.mutate(
      {
        name: draft.name,
        trackingType: draft.trackingType,
        primaryMuscles: draft.primaryMuscles,
        secondaryMuscles: draft.secondaryMuscles,
        equipment: draft.equipment,
        isUnilateral: draft.isUnilateral,
        // validateDraft has refused anything else.
        videoUrl: videoUrl === 'invalid' ? null : videoUrl,
      },
      {
        onSuccess: (saved) => {
          if (noteDraft !== null && cleanNote !== (savedNote || null)) {
            saveNotes.mutate({ exerciseId: saved.id, notes: cleanNote });
          }
          onSaved(saved);
        },
      },
    );
  }

  return (
    <View style={styles.form}>
      <Card style={styles.nameCard}>
        <TextField
          label={t('exercises.form.name')}
          labelHidden
          variant="plain"
          placeholder={t('exercises.form.namePlaceholder')}
          value={draft.name}
          onChangeText={(name) => {
            setDraft((current) => ({ ...current, name }));
            // A "name taken" message no longer applies once the name changes.
            if (save.isError) save.reset();
          }}
          error={errorText(errors.name ?? (saveError === 'nameTaken' ? 'nameTaken' : undefined))}
          maxLength={EXERCISE_NAME_MAX_LENGTH}
          autoCapitalize="sentences"
          returnKeyType="done"
          style={styles.nameInput}
        />
      </Card>

      <View style={styles.section}>
        <SectionHeader title={t('exercises.form.whatYouLog')} />
        <SettingsCard>
          <SettingsRow
            icon={TRACKING_ICONS[draft.trackingType]}
            label={trackingLabel}
            detail={t(`trackingTypes.${draft.trackingType}.detail`)}
            action={t('exercises.form.change')}
            onPress={chooseTrackingType}
            aria-label={t('exercises.form.trackingTypeButton', { type: trackingLabel })}
          />
          <SettingsRow
            icon="rectangle.split.2x1"
            label={t('exercises.form.unilateral')}
            detail={t('exercises.form.unilateralHint')}
            accessory={
              <Switch
                aria-label={t('exercises.form.unilateral')}
                value={draft.isUnilateral}
                onValueChange={(isUnilateral) =>
                  setDraft((current) => ({ ...current, isUnilateral }))
                }
                trackColor={{ true: colors.accent, false: colors.surfaceRaised }}
                ios_backgroundColor={colors.surfaceRaised}
              />
            }
          />
        </SettingsCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('exercises.form.musclesAndEquipment')} />
        <SettingsCard>
          <SettingsRow
            icon="waveform.path.ecg"
            label={t('exercises.form.primaryMuscles')}
            value={
              draft.primaryMuscles.length > 0
                ? muscleNames(draft.primaryMuscles)
                : musclesRequired
                  ? t('exercises.form.primaryPlaceholder')
                  : undefined
            }
            optional={!musclesRequired}
            error={musclesRequired ? errorText(errors.primaryMuscles) : undefined}
            onPress={() => setOpenSheet('primary')}
          />
          <SettingsRow
            icon="square.stack.3d.up"
            tone="muted"
            label={t('exercises.form.secondaryShort')}
            value={muscleNames(draft.secondaryMuscles) || undefined}
            optional
            onPress={() => setOpenSheet('secondary')}
          />
          <SettingsRow
            icon="dumbbell"
            label={t('exercises.form.equipment')}
            // Always set: "Sense material" until you pick something else.
            value={t(`equipment.${draft.equipment}`)}
            onPress={() => setOpenSheet('equipment')}
          />
        </SettingsCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title={t('exercises.form.extras')} />
        <SettingsCard>
          <SettingsRow
            icon="play.rectangle"
            tone="muted"
            label={t('exercises.form.video')}
            value={draft.videoUrl ? linkHost(draft.videoUrl) : undefined}
            optional
            error={errorText(errors.videoUrl)}
            onPress={() => setOpenSheet('video')}
          />
          <SettingsRow
            icon="pencil"
            tone="muted"
            label={t('exercises.form.note')}
            value={note.trim().split('\n')[0] || undefined}
            optional
            onPress={() => setOpenSheet('note')}
          />
        </SettingsCard>
      </View>

      {saveError && saveError !== 'nameTaken' ? (
        <Text color="danger" role="alert">
          {errorText(saveError)}
        </Text>
      ) : null}

      <Button
        label={exercise ? t('exercises.form.saveChanges') : t('exercises.form.save')}
        onPress={handleSave}
        disabled={save.isPending}
      />

      <OptionSheet
        visible={openSheet === 'primary'}
        title={t('exercises.form.primaryMuscles')}
        groups={muscleGroups}
        selected={draft.primaryMuscles}
        onToggle={(muscle) => setDraft((current) => togglePrimaryMuscle(current, muscle))}
        doneLabel={t('common.done')}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'secondary'}
        title={t('exercises.form.secondaryMuscles')}
        groups={secondaryGroups}
        selected={draft.secondaryMuscles}
        onToggle={(muscle) => setDraft((current) => toggleSecondaryMuscle(current, muscle))}
        doneLabel={t('common.done')}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === 'equipment'}
        title={t('exercises.form.equipment')}
        groups={equipmentGroups}
        selected={[draft.equipment]}
        multiple={false}
        onToggle={(equipment) => setDraft((current) => ({ ...current, equipment }))}
        doneLabel={t('common.done')}
        onClose={() => setOpenSheet(null)}
      />
      <TextSheet
        visible={openSheet === 'video'}
        kind="link"
        title={t('exercises.form.video')}
        label={t('exercises.form.video')}
        placeholder={t('exercises.form.videoPlaceholder')}
        value={draft.videoUrl}
        validate={(text) =>
          readVideoUrl(text) === 'invalid' ? errorText('videoUrlInvalid') : undefined
        }
        onClose={() => setOpenSheet(null)}
        onDone={(videoUrl) => {
          setDraft((current) => ({ ...current, videoUrl: videoUrl.trim() }));
          setErrors((current) => ({ ...current, videoUrl: undefined }));
          setOpenSheet(null);
        }}
      />
      <TextSheet
        visible={openSheet === 'note'}
        title={t('exercises.detail.notes')}
        label={t('exercises.detail.notes')}
        placeholder={t('exercises.detail.notesPlaceholder')}
        value={note}
        maxLength={NOTES_MAX_LENGTH}
        onClose={() => setOpenSheet(null)}
        onDone={(text) => {
          setNoteDraft(text);
          setOpenSheet(null);
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
});
