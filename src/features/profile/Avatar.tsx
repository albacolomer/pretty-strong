import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { PrivatePhoto } from '@/features/body/PrivatePhoto';
import { usePhotoUrls, useSetAvatar } from '@/features/body/usePhotos';
import { usePickPhoto } from '@/features/body/usePickPhoto';
import { radius, touch, useTheme } from '@/theme';

import type { Profile } from './api';

const SIZE = 104;
const BADGE = 34;

// Your profile picture, or your initial; the camera badge takes a new one,
// picks one from the library (cropped square) or takes it away.
export function Avatar({ profile }: { profile: Profile | undefined }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const path = profile?.avatar_path ?? null;
  const { data: urls = {} } = usePhotoUrls(path ? [path] : []);
  const setAvatar = useSetAvatar();
  const pickPhoto = usePickPhoto();
  const initial = (profile?.display_name || profile?.username || '').charAt(0).toUpperCase();

  async function change() {
    const photo = await pickPhoto({
      title: t('photos.avatar'),
      square: true,
      remove: path
        ? { label: t('photos.removeAvatar'), run: () => setAvatar.mutate({ base64: null, oldPath: path }) }
        : undefined,
    });
    if (photo) setAvatar.mutate({ base64: photo.base64, oldPath: path });
  }

  return (
    <View>
      <View
        style={[styles.avatar, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
        aria-hidden>
        {path ? (
          <PrivatePhoto path={path} url={urls[path]} label="" style={styles.photo} />
        ) : (
          <Text variant="display" color="accent">
            {initial}
          </Text>
        )}
      </View>
      <Pressable
        role="button"
        aria-label={t('photos.avatar')}
        onPress={() => void change()}
        disabled={setAvatar.isPending || !profile}
        hitSlop={(touch.min - BADGE) / 2}
        style={({ pressed }) => [
          styles.badge,
          { backgroundColor: colors.accent, borderColor: colors.background },
          pressed && styles.pressed,
        ]}>
        {setAvatar.isPending ? (
          <ActivityIndicator size="small" color={colors.onAccent} />
        ) : (
          <SymbolView name="camera.fill" size={16} tintColor={colors.onAccent} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: BADGE,
    height: BADGE,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
