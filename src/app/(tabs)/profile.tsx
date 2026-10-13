import { useTranslation } from 'react-i18next';

import { Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { SignOutButton } from '@/features/auth/SignOutButton';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();

  return (
    <Screen title={t('tabs.profile')}>
      <Card>
        <Text variant="caption" color="textMuted">
          {t('profile.signedInAs')}
        </Text>
        <Text>{session?.user.email}</Text>
      </Card>
      <SignOutButton />
    </Screen>
  );
}
