import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button, SelectField, Text, TextField } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import type { Exercise } from './exercise';
import {
  draftFromExercise,
  emptyDraft,
  EXERCISE_NAME_MAX_LENGTH,
  needsMuscles,
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
import { useUpdateExercise } from './useUpdateExercise';
import { useEquipmentGroups, useMuscleGroups } from './useSheetOptions';
import { TRACKING_TYPES, type TrackingType } from './vocabulary';

type Sheet = 'primary' | 'secondary' | 'equipment';

type ExerciseFormProps = {
  // Pre-filled from the library search, e.g. "Hip thrust unilateral".
  initialName?: string;
  // Given when editing one of your exercises; otherwise a new one is created.
  exercise?: Exercise;
  onSaved: (exercise: Exercise) => void;
};

// Create a custom exercise (US-04), or edit one of yours (US-05).
export function ExerciseForm({ initialName = '', exercise, onSaved }: ExerciseFormProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [draft, setDraft] = useState(() =>
    exercise ? draftFromExercise(exercise) : emptyDraft(initialName),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [openSheet, setOpenSheet] = useState<Sheet | null>(null);
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise(exercise?.id ?? '');
  const save = exercise ? updateExercise : createExercise;
  const muscleGroups = useMuscleGroups();
  // A muscle that is already a main one can't also be secondary.
  const secondaryGroups = useMuscleGroups((muscle) => !draft.primaryMuscles.includes(muscle));
  const equipmentGroups = useEquipmentGroups();

  const saveError = save.isError ? saveErrorReason(save.error) : null;
  const errorText = (key: DraftFieldError | SaveErrorReason | undefined) =>
    key ? t(`exercises.form.errors.${key}`, { max: EXERCISE_NAME_MAX_LENGTH }) : undefined;
  // Cardio and runs can skip muscles; the label says so.
  const musclesRequired = needsMuscles(draft.trackingType);
  const primaryLabel = musclesRequired
    ? t('exercises.form.primaryMuscles')
    : t('exercises.form.primaryMusclesOptional');

  function handleSave() {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    save.mutate(
      {
        name: draft.name,
        trackingType: draft.trackingType,
        primaryMuscles: draft.primaryMuscles,
        secondaryMuscles: draft.secondaryMuscles,
        equipment: draft.equipment,
        isUnilateral: draft.isUnilateral,
      },
      { onSuccess: (saved) => onSaved(saved) },
    );
  }

  return (
    <View style={styles.form}>
      <TextField
        label={t('exercises.form.name')}
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
      />

      <View style={styles.section} role="radiogroup">
        <Text variant="caption" color="textMuted">
          {t('exercises.form.trackingType')}
        </Text>
        {TRACKING_TYPES.map((type) => (
          <TrackingTypeCard
            key={type}
            type={type}
            selected={draft.trackingType === type}
            onPress={() => setDraft((current) => ({ ...current, trackingType: type }))}
          />
        ))}
      </View>

      <SelectField
        label={primaryLabel}
        value={draft.primaryMuscles.map((m) => t(`muscles.${m}`)).join(', ')}
        placeholder={
          musclesRequired
            ? t('exercises.form.primaryPlaceholder')
            : t('exercises.form.secondaryPlaceholder')
        }
        error={musclesRequired ? errorText(errors.primaryMuscles) : undefined}
        onPress={() => setOpenSheet('primary')}
      />
      <SelectField
        label={t('exercises.form.secondaryMuscles')}
        value={draft.secondaryMuscles.map((m) => t(`muscles.${m}`)).join(', ')}
        placeholder={t('exercises.form.secondaryPlaceholder')}
        onPress={() => setOpenSheet('secondary')}
      />
      <SelectField
        label={t('exercises.form.equipment')}
        // Always set: "Sense material" until you pick something else.
        value={t(`equipment.${draft.equipment}`)}
        placeholder=""
        onPress={() => setOpenSheet('equipment')}
      />

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text>{t('exercises.form.unilateral')}</Text>
          <Text variant="caption" color="textMuted">
            {t('exercises.form.unilateralHint')}
          </Text>
        </View>
        <Switch
          aria-label={t('exercises.form.unilateral')}
          value={draft.isUnilateral}
          onValueChange={(isUnilateral) => setDraft((current) => ({ ...current, isUnilateral }))}
          trackColor={{ true: colors.accent, false: colors.surfaceRaised }}
          ios_backgroundColor={colors.surfaceRaised}
        />
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
        title={primaryLabel}
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
    </View>
  );
}

// One tracking type, with what you'll log, e.g. "Pes i repeticions · kg · reps".
function TrackingTypeCard({
  type,
  selected,
  onPress,
}: {
  type: TrackingType;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      aria-label={t(`trackingTypes.${type}.label`)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.trackingCard,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <Text variant="bodyStrong" color={selected ? 'accent' : 'text'}>
        {t(`trackingTypes.${type}.label`)}
      </Text>
      <Text variant="caption" color="textMuted">
        {t(`trackingTypes.${type}.detail`)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  trackingCard: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
