import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { LanguagePicker } from '@/features/profile/LanguagePicker';
import { ProfileSummary } from '@/features/profile/ProfileSummary';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.profile')}>
      <ProfileSummary />
      <LanguagePicker />
      <SignOutButton />
    </Screen>
  );
}
