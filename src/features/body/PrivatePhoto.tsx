import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

// How strongly a hidden photo is blurred: enough that nothing shows.
const HIDDEN_BLUR = 60;

// A picture from the private bucket, through its signed link. Cached by
// its path, so a new link (they run out) doesn't download it again. A
// hidden one shows blurred, with a lock.
export function PrivatePhoto({
  path,
  url,
  label,
  fit = 'cover',
  blurred = false,
  style,
}: {
  path: string;
  // Missing while the link is on its way.
  url: string | undefined;
  label: string;
  fit?: 'cover' | 'contain';
  blurred?: boolean;
  style: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.frame, { backgroundColor: colors.surfaceRaised }, style]}>
      {url ? (
        <Image
          source={{ uri: url, cacheKey: path }}
          accessibilityLabel={label}
          contentFit={fit}
          cachePolicy="memory-disk"
          blurRadius={blurred ? HIDDEN_BLUR : 0}
          transition={150}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {blurred ? (
        <View style={styles.lock} aria-hidden>
          <SymbolView name="lock.fill" size={22} tintColor={colors.text} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  lock: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
