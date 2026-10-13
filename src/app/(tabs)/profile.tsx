import { useTranslation } from 'react-i18next';

import { Card, Screen, Text } from '@/components/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.profile')}>
      <Card>
        <Text color="textMuted">{t('placeholder.profile')}</Text>
      </Card>
    </Screen>
  );
}
