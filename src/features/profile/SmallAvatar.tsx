import { StyleSheet, Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { PrivatePhoto } from '@/features/body/PrivatePhoto';
import { usePhotoUrls } from '@/features/body/usePhotos';
import { radius, useTheme } from '@/theme';

import { useProfile } from './useProfile';

const SIZE = 48;

// Your picture (or initial) in a small circle, e.g. at the top of Avui;
// a tap goes to your profile.
export function SmallAvatar({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  const { data: profile } = useProfile();
  const path = profile?.avatar_path ?? null;
  const { data: urls = {} } = usePhotoUrls(path ? [path] : []);
  const initial = (profile?.display_name || profile?.username || '').charAt(0).toUpperCase();

  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.avatar,
        { backgroundColor: colors.accentSoft },
        pressed && styles.pressed,
      ]}>
      {path ? (
        <PrivatePhoto path={path} url={urls[path]} label="" style={styles.photo} />
      ) : (
        <Text variant="cardTitle" color="accent">
          {initial}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  pressed: {
    opacity: 0.75,
  },
});
