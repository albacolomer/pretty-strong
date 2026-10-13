import { useTranslation } from 'react-i18next';

import { Card, Screen, Text } from '@/components/ui';

export default function PlanScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.plan')}>
      <Card>
        <Text color="textMuted">{t('placeholder.plan')}</Text>
      </Card>
    </Screen>
  );
}
