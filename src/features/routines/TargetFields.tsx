import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { NumberInput, Text } from '@/components/ui';
import { useAppLanguage } from '@/lib/i18n';
import { spacing } from '@/theme';

import type { ExerciseTargets } from './routine';
import {
  formatInput,
  INPUT_SPECS,
  inputValue,
  parseInput,
  withInput,
  type TargetInput,
} from './targets';

// Changes the plan as it is when applied, so quick typing in one field
// never undoes another.
export type TargetsUpdate = (targets: ExerciseTargets) => ExerciseTargets;

type TargetFieldsProps = {
  // Which numbers to ask for, e.g. TARGET_INPUTS[trackingType].
  inputs: readonly TargetInput[];
  // Above the fields, e.g. "Cada repetició"; none unless given.
  title?: string;
  targets: ExerciseTargets;
  // The exercise's name, so VoiceOver says which exercise each field is for.
  exerciseName: string;
  onChange: (update: TargetsUpdate) => void;
};

// The first-time plan for one exercise: the numbers its tracking type logs,
// e.g. reps and kg, or km and time for a run; or a run block's numbers.
export function TargetFields({ inputs, title, targets, exerciseName, onChange }: TargetFieldsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      {title ? (
        <Text variant="caption" color="textMuted">
          {title}
        </Text>
      ) : null}
      <View style={styles.row}>
        {inputs.map((input) => (
          <TargetInputField
            key={input}
            input={input}
            targets={targets}
            label={t(`routines.targets.inputs.${input}`)}
            ariaLabel={t('routines.targets.inputFor', {
              input: t(`routines.targets.inputs.${input}`),
              name: exerciseName,
            })}
            onChange={onChange}
          />
        ))}
      </View>
    </View>
  );
}

type TargetInputFieldProps = {
  input: TargetInput;
  targets: ExerciseTargets;
  label: string;
  ariaLabel: string;
  onChange: (update: TargetsUpdate) => void;
  // In a table, whose header names the column.
  labelHidden?: boolean;
  width?: number;
  // Shown in grey while empty, e.g. the planned number in a workout.
  placeholder?: string;
};

// One field. It keeps the text as typed ("42," on the way to "42,5") and
// saves the number it reads; when you leave it, it shows that number.
export function TargetInputField({
  input,
  targets,
  label,
  ariaLabel,
  onChange,
  labelHidden = false,
  width,
  placeholder,
}: TargetInputFieldProps) {
  const language = useAppLanguage();
  const [text, setText] = useState(() => formatInput(inputValue(targets, input), language));
  const { decimals, maxLength } = INPUT_SPECS[input];

  return (
    <NumberInput
      label={label}
      labelHidden={labelHidden}
      aria-label={ariaLabel}
      style={width === undefined ? undefined : { width, minWidth: width }}
      placeholder={placeholder}
      decimal={decimals > 0}
      maxLength={maxLength}
      value={text}
      onChangeText={(typed) => {
        setText(typed);
        const value = parseInput(input, typed);
        onChange((current) => withInput(current, input, value));
      }}
      onBlur={() => setText(formatInput(parseInput(input, text), language))}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
