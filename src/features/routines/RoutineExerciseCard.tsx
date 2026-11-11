import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, MenuButton, Text, useActionSheet } from '@/components/ui';
import { exerciseName, type Exercise } from '@/features/exercises/exercise';
import { ExercisePicture } from '@/features/exercises/ExerciseRow';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, touch, useTheme } from '@/theme';

import { AddNoteButton, ExerciseNoteInput } from './ExerciseNoteField';
import { MeasureChips } from './MeasureChips';
import { RestField } from './RestField';
import type { DraftExercise } from './routineDraft';
import { SetTable } from './SetTable';
import type { TargetsUpdate } from './TargetFields';
import { MEASURE_CHOICES, measureInputs, measuresOf, TARGET_INPUTS, type Measure } from './targets';

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
  // A measure added or taken off (a cardio machine's or a carry's chips).
  onMeasuresChange: (measures: Measure[], removed: Measure | null) => void;
  onRestChange: (restS: number | null) => void;
  onNotesChange: (notes: string) => void;
  onMakeSuperset: (otherKey: string) => void;
  onLeaveGroup: () => void;
  onRemove: () => void;
};

// One exercise in the routine editor: picture, name and ⋯; for a cardio
// machine or a carry, what it measures; its sets, each with its first-time
// plan; then rest and "+ Nota" on one line. The picture and
// name open the exercise's page; the page opens on top, so the editor stays as
// it is. The ⋯ menu holds that too, and everything else: reorder, supersets,
// the exercise's own rest, remove.
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
  onMeasuresChange,
  onRestChange,
  onNotesChange,
  onMakeSuperset,
  onLeaveGroup,
  onRemove,
}: RoutineExerciseCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const showActionSheet = useActionSheet();
  const language = useAppLanguage();
  const name = exercise ? exerciseName(exercise, language) : '…';
  // A cardio machine or a carry: only the measures chosen.
  const choosesMeasures = exercise ? MEASURE_CHOICES[exercise.trackingType] !== undefined : false;
  const measures = exercise
    ? measuresOf(
        exercise.trackingType,
        item.measures,
        item.sets.map((set) => set.targets),
      )
    : [];
  // The note shows once asked for with "+ Nota", or straight away if set.
  const [notesOpen, setNotesOpen] = useState(item.notes !== '');

  function openExercise() {
    if (exercise) {
      router.push({
        pathname: '/plan/exercises/[id]',
        params: { id: exercise.id, from: 'routine' },
      });
    }
  }

  function showSheet(
    title: string,
    actions: { label: string; run: () => void }[],
    destructive?: number,
  ) {
    showActionSheet(
      {
        title,
        options: [...actions.map((action) => action.label), t('common.cancel')],
        destructiveButtonIndex: destructive,
        cancelButtonIndex: actions.length,
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
      ...(exercise ? [{ label: t('exercises.detail.info'), run: openExercise }] : []),
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
        <Pressable
          role="button"
          aria-label={t('exercises.detail.infoFor', { name })}
          disabled={!exercise}
          onPress={openExercise}
          style={({ pressed }) => [styles.title, pressed && styles.pressed]}>
          {exercise ? <ExercisePicture exercise={exercise} size={40} /> : null}
          <Text variant="bodyStrong" style={styles.name}>
            {name}
          </Text>
          {exercise ? (
            <SymbolView name="info.circle" size={16} tintColor={colors.textMuted} />
          ) : null}
        </Pressable>
        <MenuButton label={t('exercises.menu.label', { name })} onPress={openMenu} />
      </View>

      {exercise && choosesMeasures ? (
        <MeasureChips
          trackingType={exercise.trackingType}
          measures={measures}
          exerciseName={name}
          onChange={onMeasuresChange}
        />
      ) : null}

      {exercise ? (
        <SetTable
          inputs={
            choosesMeasures ? measureInputs(measures) : TARGET_INPUTS[exercise.trackingType]
          }
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
  // Takes the row up to the ⋯, so the whole title is one big target.
  title: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
  },
  name: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
