import { Pressable, StyleSheet } from 'react-native';

import { touch } from '@/theme';

import { Text } from './Text';

// The ⋯ button that opens an item's actions menu. `label` is what screen
// readers say, e.g. "Opcions de «Hip thrust»".
export function MenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text variant="cardTitle" color="textMuted">
        ⋯
      </Text>
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
  pressed: {
    opacity: 0.75,
  },
});
