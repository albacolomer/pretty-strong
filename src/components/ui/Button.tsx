import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  metalTextShadows,
  radius,
  spacing,
  touch,
  useTheme,
  type ColorToken,
} from '@/theme';

import { GradientView } from './GradientView';
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
      {metal ? (
        <>
          <GradientView gradient="metal" style={styles.fill} />
          {/* Over the gradient: the light on its top edge. */}
          <View style={[styles.fill, { boxShadow: shadows.highlight }]} />
        </>
      ) : null}
      <Text
        variant="bodyStrong"
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.pill,
    pointerEvents: 'none',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
