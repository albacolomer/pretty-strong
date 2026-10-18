import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  InputAccessoryView,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { radius, spacing, touch, typography, useTheme } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export type NumberInputProps = Omit<TextInputProps, 'keyboardType'> & {
  // Short, shown above the field, e.g. "kg"; also its VoiceOver label
  // unless aria-label says more.
  label: string;
  // Shows the keypad with a decimal separator.
  decimal?: boolean;
};

// A short number field with the number keypad (gym UX: numeric keypad for
// numbers). The keypad has no return key, so a "Fet" bar above it closes it.
export function NumberInput({ label, decimal = false, style, ...rest }: NumberInputProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const accessoryId = useId();

  return (
    <View style={styles.field}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <TextInput
        aria-label={label}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputAccessoryViewID={accessoryId}
        // Typing replaces the old number instead of adding to it.
        selectTextOnFocus
        placeholder="–"
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          styles.input,
          { backgroundColor: colors.surfaceRaised, color: colors.text },
          style,
        ]}
        {...rest}
      />
      <InputAccessoryView nativeID={accessoryId} backgroundColor={colors.surfaceRaised}>
        <View style={styles.accessory}>
          <Button label={t('common.done')} variant="ghost" onPress={() => Keyboard.dismiss()} />
        </View>
      </InputAccessoryView>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  input: {
    minWidth: 76,
    minHeight: touch.min,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    textAlign: 'center',
    // Only the size, weight and tabular digits: a lineHeight would push the
    // text off-centre in iOS inputs.
    fontSize: typography.input.fontSize,
    fontWeight: typography.input.fontWeight,
    fontVariant: typography.input.fontVariant,
  },
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
});
