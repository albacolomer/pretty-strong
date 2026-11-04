import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import {
  metalTextShadows,
  radius,
  spacing,
  touch,
  useTheme,
  type ColorToken,
} from '@/theme';

import { MetalFill } from './MetalFill';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  // What screen readers say, when the visible label is shorter, e.g. "+ Nota".
  'aria-label'?: string;
  // An SF Symbol before the label, e.g. "plus".
  icon?: SFSymbol;
  // Small spaced capitals, like "+ AFEGEIX EXERCICIS".
  caps?: boolean;
};

const textColors: Record<ButtonVariant, ColorToken> = {
  primary: 'onMetal',
  secondary: 'text',
  ghost: 'accent',
};

// Primary: brushed metal, like Avui's GO. Secondary: a white pill raised
// off the page. Ghost: just the accent-coloured label.
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  'aria-label': ariaLabel,
  icon,
  caps = false,
}: ButtonProps) {
  const { colors, shadows } = useTheme();
  const metal = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      aria-label={ariaLabel}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && { backgroundColor: colors.surface },
        variant !== 'ghost' && { boxShadow: shadows.control },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {metal ? <MetalFill borderRadius={radius.pill} /> : null}
      {icon ? (
        <SymbolView
          name={icon}
          size={15}
          weight="semibold"
          tintColor={colors[textColors[variant]]}
        />
      ) : null}
      <Text
        variant={caps ? 'label' : 'bodyStrong'}
        color={textColors[variant]}
        numberOfLines={1}
        style={metal && metalTextShadows.small}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
