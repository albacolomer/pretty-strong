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

// Drawn thin; each option still takes a touch.min tap, reaching above and
// below the track.
const OPTION_HEIGHT = 28;
const TRACK_PADDING = 3;
const HIT_SLOP = {
  top: (touch.min - OPTION_HEIGHT) / 2,
  bottom: (touch.min - OPTION_HEIGHT) / 2,
};

// A pill-shaped track with one option raised on it, iOS style (screen
// readers announce it as a group of radio buttons).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const { colors, shadows, scheme } = useTheme();
  // The selected option is the lighter one: white on grey in light mode,
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
            hitSlop={HIT_SLOP}
            style={({ pressed }) => [
              styles.option,
              // Raised off the track.
              selected && { backgroundColor: raised, boxShadow: shadows.control },
              pressed && !selected && styles.pressed,
            ]}>
            <Text variant="control" color={selected ? 'text' : 'textMuted'} numberOfLines={1}>
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
    padding: TRACK_PADDING,
    borderRadius: radius.pill,
  },
  option: {
    flex: 1,
    height: OPTION_HEIGHT,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
