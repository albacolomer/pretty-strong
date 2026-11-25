import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

// The three tabs, in iOS's own tab bar (SF Symbols, since iOS draws it).
// The web draws a look-alike: AppTabs.web.tsx.
export function AppTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <NativeTabs tintColor={colors.accent}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.today')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>{t('tabs.plan')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'list.bullet.clipboard', selected: 'list.bullet.clipboard.fill' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
