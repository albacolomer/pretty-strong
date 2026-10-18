import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';

import { Card, MenuButton, Stepper, Text } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { AddNoteButton, ExerciseNoteInput } from './ExerciseNoteField';
import { RestField } from './RestField';
import { PLANNED_SETS_MAX } from './routine';
import type { DraftExercise } from './routineDraft';
import {
  INTERVALS_MIN,
  isRunBlockComplete,
  RUN_BLOCK_INPUTS,
  runBlockSummary,
  type RunBlockKind,
} from './runBlocks';
import { TargetFields, type TargetsUpdate } from './TargetFields';

type RunBlockCardProps = {
  block: DraftExercise;
  kind: RunBlockKind;
  // 1, 2, 3…: names the block, e.g. "Bloc 2: Sèries".
  number: number;
  // After a save attempt: say so if the block has no distance or time.
  showIncomplete: boolean;
  // Opens the reorder sheet; left out when there's nothing to reorder.
  onReorder?: () => void;
  onRepetitionsChange: (repetitions: number) => void;
  onRecoveryChange: (restS: number) => void;
  onTargetsChange: (update: TargetsUpdate) => void;
  onNotesChange: (notes: string) => void;
  onRemove: () => void;
};

// One block of a run routine: Distància, Temps or Sèries (repetitions,
// each one's distance and/or time, and the recovery between them).
export function RunBlockCard({
  block,
  kind,
  number,
  showIncomplete,
  onReorder,
  onRepetitionsChange,
  onRecoveryChange,
  onTargetsChange,
  onNotesChange,
  onRemove,
}: RunBlockCardProps) {
  const { t } = useTranslation();
  const { scheme } = useTheme();
  const language = useAppLanguage();
  const kindName = t(`routines.blocks.kinds.${kind}`);
  const name = t('routines.blocks.name', { number, kind: kindName });
  const summary = runBlockSummary(kind, block, language);
  // The note shows once asked for with "+ Nota", or straight away if set.
  const [notesOpen, setNotesOpen] = useState(block.notes !== '');

  function openMenu() {
    const actions = [
      ...(onReorder ? [{ label: t('routines.reorder.open'), run: onReorder }] : []),
      { label: t('routines.blocks.remove'), run: onRemove },
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: name,
        options: [...actions.map((action) => action.label), t('common.cancel')],
        destructiveButtonIndex: actions.length - 1,
        cancelButtonIndex: actions.length,
        userInterfaceStyle: scheme,
      },
      (index) => actions[index]?.run(),
    );
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <View style={styles.title}>
          <Text variant="bodyStrong">{kindName}</Text>
          {summary !== '' ? (
            <Text variant="caption" color="textMuted">
              {summary}
            </Text>
          ) : null}
        </View>
        <MenuButton label={t('exercises.menu.label', { name })} onPress={openMenu} />
      </View>

      {kind === 'intervals' ? (
        <View style={styles.row}>
          <Text variant="caption" color="textMuted">
            {t('routines.blocks.repetitions')}
          </Text>
          <Stepper
            value={String(block.plannedSets)}
            valueLabel={t('routines.blocks.repetitionsValue', { count: block.plannedSets })}
            onDecrement={() => onRepetitionsChange(block.plannedSets - 1)}
            onIncrement={() => onRepetitionsChange(block.plannedSets + 1)}
            decrementLabel={t('routines.blocks.repetitionsMinus')}
            incrementLabel={t('routines.blocks.repetitionsPlus')}
            canDecrement={block.plannedSets > INTERVALS_MIN}
            canIncrement={block.plannedSets < PLANNED_SETS_MAX}
          />
        </View>
      ) : null}

      <TargetFields
        inputs={RUN_BLOCK_INPUTS[kind]}
        title={
          kind === 'intervals' ? t('routines.blocks.eachRepetition') : t('routines.blocks.target')
        }
        targets={block.targets}
        exerciseName={name}
        onChange={onTargetsChange}
      />
      {showIncomplete && !isRunBlockComplete(kind, block.targets) ? (
        <Text variant="caption" color="danger">
          {t(`routines.blocks.incomplete.${kind}`)}
        </Text>
      ) : null}

      <View style={styles.row}>
        {kind === 'intervals' ? (
          <RestField
            label={t('routines.blocks.recovery')}
            value={block.restS}
            defaultS={0}
            onChange={onRecoveryChange}
            valueLabel={(time) => t('routines.blocks.recoveryValue', { time })}
          />
        ) : (
          <View />
        )}
        {notesOpen ? null : <AddNoteButton name={name} onPress={() => setNotesOpen(true)} />}
      </View>

      {notesOpen ? (
        <ExerciseNoteInput
          notes={block.notes}
          name={name}
          onChange={onNotesChange}
          autoFocus={block.notes === ''}
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
  title: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
