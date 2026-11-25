import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Screen, Icon } from '@/components/ui';
import { ProfileHeader } from '@/features/profile/ProfileHeader';
import { ProfileTabs } from '@/features/profile/ProfileTabs';
import { touch, useTheme } from '@/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Screen
      title={t('tabs.profile')}
      action={
        <Pressable
          role="button"
          aria-label={t('settings.title')}
          onPress={() => router.push('/profile/settings')}
          style={({ pressed }) => [styles.settings, pressed && styles.pressed]}>
          <Icon name="gearshape" size={24} tintColor={colors.text} />
        </Pressable>
      }>
      <ProfileHeader onEdit={() => router.push('/profile/edit')} />
      <ProfileTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  settings: {
    width: touch.min,
    height: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
