import { Icon } from './Icon';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { touch, useTheme } from '@/theme';

// Drawn at the header's size; the tap area is grown to touch.min.
const SIZE = 36;

// The header's ‹, drawn by us, for a screen that asks before it closes.
// iOS's own back button closes the screen natively before it can be asked
// to stay, and on iOS 26 putting it back can leave the header without a
// back button. Going back from here asks first, without that round trip.
export function HeaderBackButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      role="button"
      aria-label={t('common.back')}
      onPress={onPress}
      hitSlop={(touch.min - SIZE) / 2}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon name="chevron.left" size={18} weight="semibold" tintColor={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
