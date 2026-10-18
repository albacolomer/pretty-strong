import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';

import { Button, Card, MenuButton, Text, TextField } from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { EXERCISE_NOTES_MAX_LENGTH } from './routine';
import type { DraftExercise } from './routineDraft';
import { SetsAndRest } from './SetsAndRest';
import { TargetFields, type TargetsUpdate } from './TargetFields';

export type GroupKind = 'superset' | 'circuit';

type RoutineExerciseCardProps = {
  item: DraftExercise;
  exercise: Exercise | undefined;
  // The exercise's own default rest, used while this routine doesn't set one.
  exerciseRestS: number;
  // In a superset or circuit, whose box shows the rounds and rest instead.
  group: GroupKind | null;
  // The exercises this one can make a superset with.
  supersetOptions: { key: string; name: string }[];
  onSetsChange: (sets: number) => void;
  onRestChange: (restS: number | null) => void;
  onNotesChange: (notes: string) => void;
  onTargetsChange: (update: TargetsUpdate) => void;
  onMakeSuperset: (otherKey: string) => void;
  onLeaveGroup: () => void;
  onRemove: () => void;
};

// One exercise in the routine editor: planned sets, rest, the first-time
// plan, this routine's note on it, and a ⋯ menu for supersets and removing it.
export function RoutineExerciseCard({
  item,
  exercise,
  exerciseRestS,
  group,
  supersetOptions,
  onSetsChange,
  onRestChange,
  onNotesChange,
  onTargetsChange,
  onMakeSuperset,
  onLeaveGroup,
  onRemove,
}: RoutineExerciseCardProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const language = useAppLanguage();
  const name = exercise ? exerciseName(exercise, language) : '…';
  // The note field shows once asked for, or straight away if there's a note.
  const [notesOpen, setNotesOpen] = useState(item.notes !== '');

  function showSheet(
    title: string,
    actions: { label: string; run: () => void }[],
    destructive?: number,
  ) {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((action) => action.label), t('common.cancel')],
        destructiveButtonIndex: destructive,
        cancelButtonIndex: actions.length,
        userInterfaceStyle: scheme,
      },
      (index) => actions[index]?.run(),
    );
  }

  function pickSupersetPartner() {
    showSheet(
      t('routines.editor.menu.pickPartner'),
      supersetOptions.map((option) => ({
        label: option.name,
        run: () => onMakeSuperset(option.key),
      })),
    );
  }

  function openMenu() {
    const supersetLabel =
      group === null
        ? t('routines.editor.menu.superset')
        : t(`routines.editor.menu.addTo.${group}`);
    const actions = [
      ...(supersetOptions.length > 0 ? [{ label: supersetLabel, run: pickSupersetPartner }] : []),
      ...(group ? [{ label: t(`routines.editor.menu.leave.${group}`), run: onLeaveGroup }] : []),
      { label: t('routines.editor.menu.remove'), run: onRemove },
    ];
    showSheet(name, actions, actions.length - 1);
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        {exercise ? <ExercisePicture exercise={exercise} size={48} /> : null}
        <Text variant="bodyStrong" style={styles.name}>
          {name}
        </Text>
        <MenuButton label={t('exercises.menu.label', { name })} onPress={openMenu} />
      </View>

      {group === null ? (
        <SetsAndRest
          plannedSets={item.plannedSets}
          restS={item.restS}
          exerciseRestS={exerciseRestS}
          onSetsChange={onSetsChange}
          onRestChange={onRestChange}
        />
      ) : null}

      {exercise ? (
        <TargetFields
          trackingType={exercise.trackingType}
          targets={item.targets}
          exerciseName={name}
          onChange={onTargetsChange}
        />
      ) : null}

      {notesOpen ? (
        <TextField
          label={t('routines.editor.exerciseNotes')}
          // Several cards have this field: VoiceOver also says which exercise.
          aria-label={t('routines.editor.exerciseNotesFor', { name })}
          placeholder={t('routines.editor.exerciseNotesPlaceholder')}
          value={item.notes}
          onChangeText={onNotesChange}
          // Only when just asked for, not when the routine opens.
          autoFocus={item.notes === ''}
          multiline
          maxLength={EXERCISE_NOTES_MAX_LENGTH}
          style={styles.notes}
        />
      ) : (
        <Button
          label={t('routines.editor.addExerciseNotes')}
          variant="ghost"
          onPress={() => setNotesOpen(true)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
  },
  notes: {
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
