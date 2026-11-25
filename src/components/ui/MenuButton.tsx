import { Icon } from './Icon';
import { Pressable, StyleSheet, View } from 'react-native';

import { touch, useTheme } from '@/theme';

// The ⋮ button that opens an item's actions menu. `label` is what screen
// readers say, e.g. "Opcions de «Hip thrust»".
export function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      {/* iOS has no vertical ellipsis symbol: the horizontal one, turned. */}
      <View style={styles.vertical}>
        <Icon name="ellipsis" size={18} weight="semibold" tintColor={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vertical: {
    transform: [{ rotate: '90deg' }],
  },
  pressed: {
    opacity: 0.75,
  },
});
