import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { NumberInput, Text } from '@/components/ui';
import type { TrackingType } from '@/features/exercises/vocabulary';
import { useAppLanguage } from '@/lib/i18n';
import { spacing } from '@/theme';

import type { ExerciseTargets } from './routine';
import {
  formatInput,
  INPUT_SPECS,
  inputValue,
  parseInput,
  TARGET_INPUTS,
  withInput,
  type TargetInput,
} from './targets';

// Changes the plan as it is when applied, so quick typing in one field
// never undoes another.
export type TargetsUpdate = (targets: ExerciseTargets) => ExerciseTargets;

type TargetFieldsProps = {
  trackingType: TrackingType;
  targets: ExerciseTargets;
  // The exercise's name, so VoiceOver says which exercise each field is for.
  exerciseName: string;
  onChange: (update: TargetsUpdate) => void;
};

// The first-time plan for one exercise: the numbers its tracking type logs,
// e.g. reps and kg, or km and time for a run. All optional.
export function TargetFields({ trackingType, targets, exerciseName, onChange }: TargetFieldsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <Text variant="caption" color="textMuted">
        {t('routines.targets.title')}
      </Text>
      <View style={styles.row}>
        {TARGET_INPUTS[trackingType].map((input) => (
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
};

// One field. It keeps the text as typed ("42," on the way to "42,5") and
// saves the number it reads; when you leave it, it shows that number.
function TargetInputField({ input, targets, label, ariaLabel, onChange }: TargetInputFieldProps) {
  const language = useAppLanguage();
  const [text, setText] = useState(() => formatInput(inputValue(targets, input), language));
  const { decimals, maxLength } = INPUT_SPECS[input];

  return (
    <NumberInput
      label={label}
      aria-label={ariaLabel}
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
