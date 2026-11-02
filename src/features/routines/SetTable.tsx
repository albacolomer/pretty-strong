import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Text, useActionSheet } from '@/components/ui';
import { spacing, touch } from '@/theme';

import { PLANNED_SETS_MAX } from './routine';
import type { DraftSet } from './routineDraft';
import { TargetInputField, type TargetsUpdate } from './TargetFields';
import type { TargetInput } from './targets';

// Up to this many numbers per set fit across the phone as a table with one
// header; more (a cardio machine's six) wrap, each with its own label.
const TABLE_MAX_INPUTS = 3;
const INPUT_WIDTH = 72;

type SetTableProps = {
  // The numbers each set asks for, e.g. reps and kg.
  inputs: readonly TargetInput[];
  sets: DraftSet[];
  // The exercise's name, so VoiceOver says which exercise and set it's on.
  exerciseName: string;
  onChange: (setKey: string, update: TargetsUpdate) => void;
  onAdd: () => void;
  onRemove: (setKey: string) => void;
};

// The planned sets, like Hevy: "Sèrie · Reps · Kg", one row per set, and
// "+ Afegeix una sèrie". The numbers are the first-time plan.
export function SetTable({ inputs, sets, exerciseName, onChange, onAdd, onRemove }: SetTableProps) {
  const { t } = useTranslation();
  const table = inputs.length <= TABLE_MAX_INPUTS;
  const inputLabel = (input: TargetInput) => t(`routines.targets.inputs.${input}`);

  return (
    <View style={styles.table}>
      {table ? (
        <View style={styles.row} aria-hidden>
          <Text variant="caption" color="textMuted" style={styles.numberColumn}>
            {t('routines.sets.header')}
          </Text>
          {inputs.map((input) => (
            <Text key={input} variant="caption" color="textMuted" style={styles.inputColumn}>
              {inputLabel(input)}
            </Text>
          ))}
        </View>
      ) : null}

      {sets.map((set, index) => {
        const rowName = t('routines.sets.rowName', { name: exerciseName, number: index + 1 });
        return (
          <View key={set.key} style={[styles.row, !table && styles.wrappingRow]}>
            <SetNumber
              number={index + 1}
              exerciseName={exerciseName}
              // An exercise keeps at least one set.
              onRemove={sets.length > 1 ? () => onRemove(set.key) : undefined}
            />
            {inputs.map((input) => (
              <TargetInputField
                key={input}
                input={input}
                targets={set.targets}
                label={inputLabel(input)}
                labelHidden={table}
                width={table ? INPUT_WIDTH : undefined}
                ariaLabel={t('routines.targets.inputFor', { input: inputLabel(input), name: rowName })}
                onChange={(update) => onChange(set.key, update)}
              />
            ))}
          </View>
        );
      })}

      <Button
        label={t('routines.sets.add')}
        aria-label={t('routines.sets.addFor', { name: exerciseName })}
        variant="ghost"
        onPress={onAdd}
        disabled={sets.length >= PLANNED_SETS_MAX}
        style={styles.add}
      />
    </View>
  );
}

type SetNumberProps = {
  number: number;
  exerciseName: string;
  // Left out for the only set, which can't be removed.
  onRemove?: () => void;
};

// The set's number; tap it for "Treu la sèrie".
function SetNumber({ number, exerciseName, onRemove }: SetNumberProps) {
  const { t } = useTranslation();
  const showActionSheet = useActionSheet();

  if (!onRemove) {
    return (
      <Text variant="bodyStrong" color="textMuted" style={[styles.numberColumn, styles.number]}>
        {number}
      </Text>
    );
  }

  function openMenu() {
    showActionSheet(
      {
        title: t('routines.sets.menuTitle', { number }),
        options: [t('routines.sets.remove'), t('common.cancel')],
        destructiveButtonIndex: 0,
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index === 0) onRemove?.();
      },
    );
  }

  return (
    <Pressable
      role="button"
      aria-label={t('routines.sets.setFor', { number, name: exerciseName })}
      onPress={openMenu}
      style={({ pressed }) => [styles.numberColumn, styles.numberButton, pressed && styles.pressed]}>
      <Text variant="bodyStrong" color="textMuted">
        {number}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  table: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  wrappingRow: {
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  numberColumn: {
    width: touch.min,
    textAlign: 'center',
  },
  number: {
    lineHeight: touch.min,
  },
  numberButton: {
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputColumn: {
    width: INPUT_WIDTH,
    textAlign: 'center',
  },
  add: {
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.75,
  },
});
