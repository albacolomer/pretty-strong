import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { TargetInputField, type TargetsUpdate } from '@/features/routines/TargetFields';
import { formatInput, inputValue, type TargetInput } from '@/features/routines/targets';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import type { ActiveSet } from './activeWorkout';

// Up to this many numbers fit across the phone next to the ✓; more wrap.
export const ROW_MAX_INPUTS = 3;
export const SET_INPUT_WIDTH = 64;

type SetRowProps = {
  number: number;
  // The numbers the exercise logs, e.g. kg and reps.
  inputs: readonly TargetInput[];
  set: ActiveSet;
  exerciseName: string;
  onType: (update: TargetsUpdate) => void;
  onToggle: () => void;
};

// One set in the workout (spec: SetRow): its number, the numbers with the
// plan pre-filled in grey, and a large ✓. Done sets are tinted.
export function SetRow({ number, inputs, set, exerciseName, onType, onToggle }: SetRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const done = set.completedAt !== null;
  const wraps = inputs.length > ROW_MAX_INPUTS;
  const rowName = t('routines.sets.rowName', { name: exerciseName, number });

  return (
    <View style={[styles.row, done && { backgroundColor: colors.accentSoft }]}>
      <Text variant="bodyStrong" color="textMuted" style={styles.number}>
        {number}
      </Text>
      <View style={[styles.inputs, wraps && styles.wrapping]}>
        {inputs.map((input) => {
          const label = t(`routines.targets.inputs.${input}`);
          return (
            <TargetInputField
              // Shown afresh when done or undone, with the numbers logged.
              key={`${input}-${done ? 'done' : 'open'}`}
              input={input}
              targets={set.typed}
              label={label}
              labelHidden={!wraps}
              width={SET_INPUT_WIDTH}
              placeholder={formatInput(inputValue(set.planned, input), language) || undefined}
              ariaLabel={t('routines.targets.inputFor', { input: label, name: rowName })}
              onChange={onType}
            />
          );
        })}
      </View>
      <Pressable
        role="checkbox"
        aria-checked={done}
        aria-label={t('workout.setFor', { number, name: exerciseName })}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.check,
          { borderColor: colors.accent },
          done && { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}>
        <Text variant="cardTitle" color={done ? 'onAccent' : 'accent'}>
          ✓
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.input,
  },
  number: {
    width: 24,
    textAlign: 'center',
  },
  inputs: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrapping: {
    flexWrap: 'wrap',
  },
  check: {
    width: touch.check,
    height: touch.check,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
