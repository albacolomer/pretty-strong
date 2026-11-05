import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { radius, useTheme } from '@/theme';

import { ExercisePhoto } from './ExerciseRow';

const SIZE = 72;

type ExercisePhotoTileProps = {
  // Just picked, not saved yet.
  base64: string | null;
  // The saved photo, while it isn't being replaced or taken away.
  path: string | null;
  // "Afegeix una foto" or "Canvia la foto".
  label: string;
  onPress: () => void;
};

// The square beside the exercise's name: its photo, or a dashed frame
// with a camera to add one.
export function ExercisePhotoTile({ base64, path, label, onPress }: ExercisePhotoTileProps) {
  const { colors } = useTheme();
  const empty = base64 === null && path === null;

  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        empty && [styles.empty, { borderColor: colors.control, backgroundColor: colors.track }],
        pressed && styles.pressed,
      ]}>
      {base64 !== null ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${base64}` }}
          contentFit="cover"
          style={styles.fill}
          aria-hidden
        />
      ) : path !== null ? (
        <ExercisePhoto path={path} size={SIZE} />
      ) : (
        <SymbolView name="camera" size={22} weight="medium" tintColor={colors.accent} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  fill: {
    width: SIZE,
    height: SIZE,
  },
  pressed: {
    opacity: 0.75,
  },
});
