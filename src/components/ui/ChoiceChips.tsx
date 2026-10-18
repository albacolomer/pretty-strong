import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touch, useTheme } from '@/theme';

import type { SegmentedOption } from './SegmentedControl';
import { Text } from './Text';

export type ChoiceChipsProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  // Read out by screen readers for the whole group, e.g. "Type".
  label: string;
};

// Pills where exactly one is selected, like SegmentedControl, but each as
// wide as its text and wrapping onto more lines: for more options, or
// longer names, than fit in one row.
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: ChoiceChipsProps<T>) {
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
              styles.chip,
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
