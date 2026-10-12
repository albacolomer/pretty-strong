import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, touch, useTheme, type ColorToken } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const variantColors: Record<ButtonVariant, { background: ColorToken | null; text: ColorToken }> = {
  primary: { background: 'accent', text: 'onAccent' },
  secondary: { background: 'surfaceRaised', text: 'text' },
  ghost: { background: null, text: 'accent' },
};

export function Button({ label, onPress, variant = 'primary', disabled = false, style }: ButtonProps) {
  const { colors } = useTheme();
  const { background, text } = variantColors[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background ? colors[background] : 'transparent' },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Text variant="bodyStrong" color={text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.min,
    paddingHorizontal: spacing.xl,
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
