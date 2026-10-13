import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touch, useTheme } from '@/theme';

import { Text } from './Text';

export type SegmentedOption<T extends string> = { value: T; label: string };

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Read out by screen readers for the whole group, e.g. "Language".
  label: string;
};

// A row of pill buttons where exactly one is selected (screen readers
// announce it as a group of radio buttons).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View role="radiogroup" aria-label={label} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-checked={selected}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: selected ? colors.accent : colors.surfaceRaised },
              pressed && !selected && styles.pressed,
            ]}>
            <Text variant="bodyStrong" color={selected ? 'onAccent' : 'text'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: touch.min,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
