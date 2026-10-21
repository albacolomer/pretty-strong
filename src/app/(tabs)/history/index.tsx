import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { HistoryCalendar } from '@/features/history/HistoryCalendar';

export default function HistoryScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('tabs.history')}>
      <HistoryCalendar />
    </Screen>
  );
}
