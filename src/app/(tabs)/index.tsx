import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { Today } from '@/features/schedule/Today';

export default function TodayScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.today')}>
      <Today />
    </Screen>
  );
}
