import { useTranslation } from 'react-i18next';

import { Card, Text } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';

import { useProfile } from './useProfile';

// Username and email at the top of the Profile tab.
export function ProfileSummary() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: profile, isError } = useProfile();

  return (
    <Card>
      {profile ? <Text variant="cardTitle">@{profile.username}</Text> : null}
      <Text color="textMuted">{session?.user.email}</Text>
      {isError ? (
        <Text variant="caption" color="danger">
          {t('profile.loadError')}
        </Text>
      ) : null}
    </Card>
  );
}
