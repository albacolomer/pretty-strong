import { useTranslation } from 'react-i18next';

import { Card, Screen, Text } from '@/components/ui';

export default function TodayScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.today')}>
      <Card>
        <Text color="textMuted">{t('placeholder.today')}</Text>
      </Card>
    </Screen>
  );
}
