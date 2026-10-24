import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

// A hidden photo is drawn this many times smaller, then scaled back up:
// only soft colour is left, however big the photo is. (Blurring alone
// works on the photo's own pixels, so a large one stayed recognisable.)
const HIDDEN_SHRINK = 24;
const HIDDEN_BLUR = 8;

// A picture from the private bucket, through its signed link. Cached by
// its path, so a new link (they run out) doesn't download it again. A
// hidden one shows as a heavy blur, with a lock.
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
  // The frame's size, to draw a hidden photo small inside it.
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);

  return (
    <View
      onLayout={(event) => setFrame(event.nativeEvent.layout)}
      style={[styles.frame, { backgroundColor: colors.surfaceRaised }, style]}>
      {url && !blurred ? (
        <Image
          source={{ uri: url, cacheKey: path }}
          accessibilityLabel={label}
          contentFit={fit}
          cachePolicy="memory-disk"
          transition={150}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {url && blurred && frame ? (
        <Image
          source={{ uri: url, cacheKey: path }}
          contentFit={fit}
          cachePolicy="memory-disk"
          blurRadius={HIDDEN_BLUR}
          style={{
            position: 'absolute',
            width: frame.width / HIDDEN_SHRINK,
            height: frame.height / HIDDEN_SHRINK,
            // Centred, then scaled up from its centre to fill the frame.
            left: (frame.width - frame.width / HIDDEN_SHRINK) / 2,
            top: (frame.height - frame.height / HIDDEN_SHRINK) / 2,
            transform: [{ scale: HIDDEN_SHRINK }],
          }}
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
