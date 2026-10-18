import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, StyleSheet, View } from 'react-native';

import { Card, MenuButton, Stepper, Text } from '@/components/ui';
import { adjustRest, formatRest, REST_MAX_S, REST_STEP_S } from '@/features/exercises/rest';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { ExerciseNoteField } from './ExerciseNoteField';
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
  const recovery = block.restS ?? 0;

  function openMenu() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: name,
        options: [t('routines.blocks.remove'), t('common.cancel')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
        userInterfaceStyle: scheme,
      },
      (index) => {
        if (index === 0) onRemove();
      },
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
        <View style={styles.controls}>
          <View style={styles.control}>
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
          <View style={styles.control}>
            <Text variant="caption" color="textMuted">
              {t('routines.blocks.recovery')}
            </Text>
            <Stepper
              value={formatRest(recovery)}
              valueLabel={t('routines.blocks.recoveryValue', { time: formatRest(recovery) })}
              onDecrement={() => onRecoveryChange(adjustRest(recovery, -REST_STEP_S))}
              onIncrement={() => onRecoveryChange(adjustRest(recovery, REST_STEP_S))}
              decrementLabel={t('routines.editor.restMinus')}
              incrementLabel={t('routines.editor.restPlus')}
              canDecrement={recovery > 0}
              canIncrement={recovery < REST_MAX_S}
            />
          </View>
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

      <ExerciseNoteField notes={block.notes} name={name} onChange={onNotesChange} />
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
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  control: {
    gap: spacing.xs,
  },
});
