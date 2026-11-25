import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';


import { MetalFill, Text, Icon } from '@/components/ui';
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
  // The next set to do: outlined.
  isNext: boolean;
  exerciseName: string;
  onType: (update: TargetsUpdate) => void;
  onToggle: () => void;
  // Opens the set's menu: drop set, RPE, remove.
  onNumberPress: () => void;
  // A cardio machine's rows are segments ("Tram 2").
  segment?: boolean;
  // A run's pace, e.g. "Ritme: 5:30 /km", under its numbers.
  pace?: string | null;
};

// One set in the workout (spec: SetRow, CardioSegmentRow): its number,
// the numbers with the plan pre-filled in grey, and a large ✓. Done sets
// are tinted.
export function SetRow({
  number,
  inputs,
  set,
  isNext,
  exerciseName,
  onType,
  onToggle,
  onNumberPress,
  segment = false,
  pace = null,
}: SetRowProps) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const language = useAppLanguage();
  const done = set.completedAt !== null;
  const wraps = inputs.length > ROW_MAX_INPUTS;
  const names = { name: exerciseName, number };
  const rowName = segment
    ? t('workout.segments.rowName', names)
    : t('routines.sets.rowName', names);

  return (
    <View
      style={[
        styles.row,
        { borderColor: isNext ? colors.accent : 'transparent' },
        done && { backgroundColor: colors.accentSoft },
      ]}>
      <Pressable
        role="button"
        aria-label={segment ? t('workout.segments.menuFor', names) : t('workout.setMenuFor', names)}
        onPress={onNumberPress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        style={({ pressed }) => [styles.number, pressed && styles.pressed]}>
        {/* A drop set shows "D"; its RPE, when given, under it. */}
        <Text variant="bodyStrong" color={set.setType === 'drop' ? 'accent' : 'textMuted'}>
          {set.setType === 'drop' ? t('workout.dropShort') : number}
        </Text>
        {set.rpe !== null ? (
          <Text variant="caption" color="textMuted">
            {`@${formatInput(set.rpe, language)}`}
          </Text>
        ) : null}
      </Pressable>
      <View style={styles.middle}>
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
        {pace ? (
          <Text variant="caption" color="textMuted">
            {pace}
          </Text>
        ) : null}
      </View>
      <Pressable
        role="checkbox"
        aria-checked={done}
        aria-label={segment ? t('workout.segments.done', names) : t('workout.setFor', names)}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.check,
          done
            ? { boxShadow: shadows.control }
            : [styles.open, { borderColor: colors.accent }],
          pressed && styles.pressed,
        ]}>
        {done ? <MetalFill borderRadius={touch.check / 2} /> : null}
        <Icon
          name="checkmark"
          size={22}
          weight="semibold"
          tintColor={done ? colors.onMetal : colors.accent}
        />
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
    borderWidth: 2,
  },
  number: {
    width: 28,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    gap: spacing.xs,
  },
  inputs: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  open: {
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
