import type { Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';

import { radius, spacing, touch, typography, useTheme } from '@/theme';

import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label: string;
  // Already translated help text shown under the input, unless there is an error.
  hint?: string;
  // Already translated message shown under the input.
  error?: string;
  // Only for screen readers, when the placeholder already says what it is.
  labelHidden?: boolean;
  // Plain: no box, for a field that sits on a card, like a routine's name.
  variant?: 'boxed' | 'plain';
  ref?: Ref<TextInputInstance>;
};

export function TextField({
  label,
  hint,
  error,
  labelHidden = false,
  variant = 'boxed',
  style,
  ref,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      {labelHidden ? null : (
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        aria-label={label}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          styles.input,
          variant === 'plain'
            ? [styles.plain, { color: colors.text }]
            : {
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
      ) : hint ? (
        <Text variant="caption" color="textMuted">
          {hint}
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
    // Only the font and size: a lineHeight would push the text off-centre
    // in iOS inputs.
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  },
  plain: {
    paddingHorizontal: 0,
    borderWidth: 0,
  },
});
