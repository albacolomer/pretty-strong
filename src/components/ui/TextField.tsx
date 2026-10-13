import type { Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, spacing, touch, typography, useTheme } from '@/theme';

import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label: string;
  // Already translated message shown under the input.
  error?: string;
  ref?: Ref<TextInput>;
};

export function TextField({ label, error, style, ref, ...rest }: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <TextInput
        ref={ref}
        aria-label={label}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceRaised,
            color: colors.text,
            borderColor: error ? colors.danger : 'transparent',
          },
          style,
        ]}
        {...rest}
      />
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
  input: {
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    borderWidth: 1,
    // Only the size: a lineHeight would push the text off-centre in iOS inputs.
    fontSize: typography.body.fontSize,
  },
});
