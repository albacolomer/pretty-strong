import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';

import { Card, MenuButton, Text } from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { AddNoteButton, ExerciseNoteInput } from './ExerciseNoteField';
import { RestField } from './RestField';
import type { DraftExercise } from './routineDraft';
import { SetTable } from './SetTable';
import type { TargetsUpdate } from './TargetFields';
import { TARGET_INPUTS } from './targets';

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
  // Opens the reorder sheet; left out when there's nothing to reorder.
  onReorder?: () => void;
  onAddSet: () => void;
  onRemoveSet: (setKey: string) => void;
  onSetTargetsChange: (setKey: string, update: TargetsUpdate) => void;
  onRestChange: (restS: number | null) => void;
  onNotesChange: (notes: string) => void;
  onMakeSuperset: (otherKey: string) => void;
  onLeaveGroup: () => void;
  onRemove: () => void;
};

// One exercise in the routine editor: picture, name and ⋯; its sets, each
// with its first-time plan; then rest and "+ Nota" on one line. The ⋯ menu holds
// everything else: reorder, supersets, the exercise's own rest, remove.
export function RoutineExerciseCard({
  item,
  exercise,
  exerciseRestS,
  group,
  supersetOptions,
  onReorder,
  onAddSet,
  onRemoveSet,
  onSetTargetsChange,
  onRestChange,
  onNotesChange,
  onMakeSuperset,
  onLeaveGroup,
  onRemove,
}: RoutineExerciseCardProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const language = useAppLanguage();
  const name = exercise ? exerciseName(exercise, language) : '…';
  // The note shows once asked for with "+ Nota", or straight away if set.
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
      ...(onReorder ? [{ label: t('routines.reorder.open'), run: onReorder }] : []),
      ...(supersetOptions.length > 0 ? [{ label: supersetLabel, run: pickSupersetPartner }] : []),
      ...(group ? [{ label: t(`routines.editor.menu.leave.${group}`), run: onLeaveGroup }] : []),
      // In a group, the rest is the group's: this resets it for all of them.
      ...(item.restS !== null
        ? [{ label: t('routines.editor.useExerciseRest'), run: () => onRestChange(null) }]
        : []),
      { label: t('routines.editor.menu.remove'), run: onRemove },
    ];
    showSheet(name, actions, actions.length - 1);
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        {exercise ? <ExercisePicture exercise={exercise} size={40} /> : null}
        <Text variant="bodyStrong" style={styles.name}>
          {name}
        </Text>
        <MenuButton label={t('exercises.menu.label', { name })} onPress={openMenu} />
      </View>

      {exercise ? (
        <SetTable
          inputs={TARGET_INPUTS[exercise.trackingType]}
          sets={item.sets}
          exerciseName={name}
          onChange={onSetTargetsChange}
          onAdd={onAddSet}
          onRemove={onRemoveSet}
        />
      ) : null}

      <View style={styles.bottomRow}>
        {group === null ? (
          <RestField
            label={t('routines.editor.rest')}
            value={item.restS}
            defaultS={exerciseRestS}
            onChange={onRestChange}
            valueLabel={(time) => t('routines.editor.restValue', { time })}
          />
        ) : (
          // In a group, the rest is in the group's box.
          <View />
        )}
        {notesOpen ? null : <AddNoteButton name={name} onPress={() => setNotesOpen(true)} />}
      </View>

      {notesOpen ? (
        <ExerciseNoteInput
          notes={item.notes}
          name={name}
          onChange={onNotesChange}
          autoFocus={item.notes === ''}
        />
      ) : null}
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
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
