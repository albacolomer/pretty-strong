import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
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
  // Only for screen readers, e.g. in a table whose header names the column.
  labelHidden?: boolean;
};

// A short number field with the number keypad (gym UX: numeric keypad for
// numbers). The keypad has no return key, so a "Fet" bar above it closes it.
export function NumberInput({
  label,
  decimal = false,
  labelHidden = false,
  placeholder = '–',
  style,
  ...rest
}: NumberInputProps) {
  const { colors } = useTheme();
  const accessoryId = useId();

  return (
    <View style={styles.field}>
      {labelHidden ? null : (
        <Text variant="caption" color="textMuted">
          {label}
        </Text>
      )}
      <TextInput
        aria-label={label}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputAccessoryViewID={accessoryId}
        // Typing replaces the old number instead of adding to it.
        selectTextOnFocus
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          styles.input,
          { backgroundColor: colors.surfaceRaised, color: colors.text },
          style,
        ]}
        {...rest}
      />
      <KeyboardDoneBar nativeID={accessoryId} />
    </View>
  );
}

// The "Fet" bar above the number keypad, which has no return key. Give the
// input inputAccessoryViewID={nativeID}.
export function KeyboardDoneBar({ nativeID }: { nativeID: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  // Safari shows its own bar with Done above every keyboard.
  if (Platform.OS === 'web') return null;

  return (
    <InputAccessoryView
      nativeID={nativeID}
      backgroundColor={colors.surfaceRaised}
      style={styles.accessoryHost}
    >
      <View style={styles.accessory}>
        <Button label={t('common.done')} variant="ghost" onPress={() => Keyboard.dismiss()} />
      </View>
    </InputAccessoryView>
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
    // Only the font, size and tabular digits: a lineHeight would push the
    // text off-centre in iOS inputs.
    fontFamily: typography.input.fontFamily,
    fontSize: typography.input.fontSize,
    fontVariant: typography.input.fontVariant,
  },
  // React Native 0.88 bug: when iOS reuses the native view of an
  // InputAccessoryView it forgets to keep it hidden, so it shows in the page
  // as a grey, screen-wide strip over the field. The bar above the keyboard
  // is a separate view, so this one can safely be invisible and untappable.
  accessoryHost: {
    opacity: 0,
    pointerEvents: 'none',
  },
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
});
