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

// A pill-shaped track with one option raised on it, iOS style (screen
// readers announce it as a group of radio buttons).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const { colors, scheme } = useTheme();
  // The selected option is the lighter one: white on pink in light mode,
  // the raised surface on the plain one in dark mode.
  const track = scheme === 'dark' ? colors.surface : colors.surfaceRaised;
  const raised = scheme === 'dark' ? colors.surfaceRaised : colors.surface;

  return (
    <View
      role="radiogroup"
      aria-label={label}
      style={[styles.group, { backgroundColor: track }]}>
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
              selected && [styles.selected, { backgroundColor: raised, shadowColor: colors.text }],
              pressed && !selected && styles.pressed,
            ]}>
            <Text variant="bodyStrong" color={selected ? 'text' : 'textMuted'} numberOfLines={1}>
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
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  option: {
    flex: 1,
    minHeight: touch.min,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Raised off the track.
  selected: {
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  pressed: {
    opacity: 0.75,
  },
});
