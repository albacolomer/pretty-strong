import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/ui';
import { BodyTab } from '@/features/body/BodyTab';
import { CalendarTab } from '@/features/history/CalendarTab';
import { spacing } from '@/theme';

import { ProgressTab } from './ProgressTab';

type Tab = 'progress' | 'calendar' | 'body';

// Progress | Calendar | Body under the profile header. Calendar is your
// history (US-23, US-24), Progress your training over time (US-26), Body
// your weight and measurements (US-28).
export function ProfileTabs() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('calendar');

  return (
    <View style={styles.tabs}>
      <SegmentedControl
        label={t('profile.sections')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'progress', label: t('profile.progress') },
          { value: 'calendar', label: t('profile.calendar') },
          { value: 'body', label: t('profile.body') },
        ]}
      />
      {tab === 'calendar' ? (
        <CalendarTab />
      ) : tab === 'progress' ? (
        <ProgressTab />
      ) : (
        <BodyTab />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    gap: spacing.lg,
  },
});
