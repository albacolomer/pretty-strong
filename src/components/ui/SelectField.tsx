import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, touch, useTheme } from '@/theme';

import { Text } from './Text';

export type SelectFieldProps = {
  label: string;
  // The current choice as text; the placeholder shows when there is none.
  value: string;
  placeholder: string;
  onPress: () => void;
  // Already translated message shown under the field.
  error?: string;
};

// Looks like a text field, but opens a picker (e.g. a sheet) when tapped.
export function SelectField({ label, value, placeholder, onPress, error }: SelectFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Pressable
        role="button"
        aria-label={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.box,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: error ? colors.danger : 'transparent',
          },
          pressed && styles.pressed,
        ]}>
        <Text color={value ? 'text' : 'textMuted'} numberOfLines={1} style={styles.value}>
          {value || placeholder}
        </Text>
        <Text color="textMuted" aria-hidden>
          ›
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  box: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  value: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
