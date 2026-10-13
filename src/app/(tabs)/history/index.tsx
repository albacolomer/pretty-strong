import { useTranslation } from 'react-i18next';

import { Card, Screen, Text } from '@/components/ui';

export default function HistoryScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.history')}>
      <Card>
        <Text color="textMuted">{t('placeholder.history')}</Text>
      </Card>
    </Screen>
  );
}
