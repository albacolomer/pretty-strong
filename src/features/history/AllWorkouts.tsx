import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { formatMonth } from './calendar';
import type { HistoryEntry } from './entries';
import { useHistoryEntries } from './useHistory';
import { WorkoutRow } from './WorkoutRow';

// Profile → Calendar → Mostra-ho tot (US-23): every workout, by month,
// newest first.
export function AllWorkouts() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const history = useHistoryEntries();

  if (history.isPending) return <ActivityIndicator color={colors.accent} />;
  if (history.isError) return <Text color="danger">{t('history.loadError')}</Text>;
  if (history.entries.length === 0) {
    return (
      <Card>
        <Text color="textMuted">{t('history.empty')}</Text>
      </Card>
    );
  }

  const months: { key: string; entries: HistoryEntry[] }[] = [];
  for (const entry of history.entries) {
    const key = entry.date.slice(0, 7);
    const last = months.at(-1);
    if (last?.key === key) last.entries.push(entry);
    else months.push({ key, entries: [entry] });
  }

  return (
    <View style={styles.page}>
      {months.map(({ key, entries }) => (
        <Card key={key}>
          <Text variant="cardTitle" accessibilityRole="header">
            {formatMonth(fromDateKey(`${key}-01`), language)}
          </Text>
          {entries.map((entry) => (
            <WorkoutRow key={entry.id} entry={entry} />
          ))}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
});
