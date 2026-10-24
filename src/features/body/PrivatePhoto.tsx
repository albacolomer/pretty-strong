import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';
import { View } from 'react-native';

import { useTheme } from '@/theme';

// A picture from the private bucket, through its signed link. Cached by
// its path, so a new link (they run out) doesn't download it again.
export function PrivatePhoto({
  path,
  url,
  label,
  fit = 'cover',
  style,
}: {
  path: string;
  // Null while the link is on its way.
  url: string | undefined;
  label: string;
  fit?: 'cover' | 'contain';
  style: StyleProp<ImageStyle>;
}) {
  const { colors } = useTheme();
  if (!url) return <View style={[style, { backgroundColor: colors.surfaceRaised }]} />;
  return (
    <Image
      source={{ uri: url, cacheKey: path }}
      accessibilityLabel={label}
      contentFit={fit}
      cachePolicy="memory-disk"
      transition={150}
      style={[{ backgroundColor: colors.surfaceRaised }, style]}
    />
  );
}
