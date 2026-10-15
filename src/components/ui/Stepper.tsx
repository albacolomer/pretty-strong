import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touch, useTheme } from '@/theme';

import { Text } from './Text';

export type StepperProps = {
  // Shown between the buttons, e.g. "3" or "1:30".
  value: string;
  // What screen readers say for the value, e.g. "3 sèries".
  valueLabel: string;
  // Greyed out, e.g. when it's a default rather than your own choice.
  muted?: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  // What screen readers say for each button, e.g. "Treu una sèrie".
  decrementLabel: string;
  incrementLabel: string;
  canDecrement?: boolean;
  canIncrement?: boolean;
};

// − value + with 48-pt buttons (gym UX rule 1), for quick changes without
// typing.
export function Stepper({
  value,
  valueLabel,
  muted = false,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  canDecrement = true,
  canIncrement = true,
}: StepperProps) {
  return (
    <View style={styles.stepper}>
      <StepButton symbol="−" label={decrementLabel} onPress={onDecrement} disabled={!canDecrement} />
      <Text variant="input" color={muted ? 'textMuted' : 'text'} aria-label={valueLabel} style={styles.value}>
        {value}
      </Text>
      <StepButton symbol="+" label={incrementLabel} onPress={onIncrement} disabled={!canIncrement} />
    </View>
  );
}

function StepButton({
  symbol,
  label,
  onPress,
  disabled,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surfaceRaised },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text variant="cardTitle">{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: {
    minWidth: 56,
    textAlign: 'center',
  },
  button: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
