import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { radius, touch, useTheme } from '@/theme';

// Drawn at the design's size; the tap area is grown to touch.min.
const SIZE = 44;

export type IconButtonProps = {
  icon: SFSymbol;
  // What screen readers say, e.g. "Previsualitza «Tren superior 2»".
  label: string;
  onPress: () => void;
  iconSize?: number;
  // Greyed out and not tappable, e.g. "‹" on the first week there is.
  disabled?: boolean;
};

// A small white round button with only an icon, raised off the page.
export function IconButton({
  icon,
  label,
  onPress,
  iconSize = 18,
  disabled = false,
}: IconButtonProps) {
  const { colors, shadows } = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      hitSlop={(touch.min - SIZE) / 2}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.surface, boxShadow: shadows.control },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <SymbolView name={icon} size={iconSize} weight="light" tintColor={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.35,
  },
});
