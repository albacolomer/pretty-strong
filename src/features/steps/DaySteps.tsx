import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { addMonths, startOfMonth } from '@/features/history/calendar';
import { addDays, dateKey, fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { useDailySteps } from './useDailySteps';
import { useTodaySteps } from './useTodaySteps';

// Profile → Calendar: "8.432 passos" with the picked day's activities
// (US-31). Today's come live from the phone, as on Avui; other days' are
// the ones saved. A day without any shows nothing.
export function DaySteps({ day, today }: { day: string; today: Date }) {
  return day === dateKey(today) ? <TodaySteps today={today} /> : <SavedSteps day={day} />;
}

function TodaySteps({ today }: { today: Date }) {
  const { steps } = useTodaySteps(today);
  return steps.status === 'ready' && steps.steps > 0 ? <StepsLine steps={steps.steps} /> : null;
}

// The day's month is loaded whole, so moving between its days is instant.
function SavedSteps({ day }: { day: string }) {
  const month = startOfMonth(fromDateKey(day));
  const { data } = useDailySteps(dateKey(month), dateKey(addDays(addMonths(month, 1), -1)));
  const steps = data?.get(day);
  return steps ? <StepsLine steps={steps} /> : null;
}

function StepsLine({ steps }: { steps: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();

  return (
    <View style={styles.line}>
      <SymbolView name="figure.walk" size={18} tintColor={colors.textMuted} />
      <Text color="textMuted">
        {t('steps.onDay', { count: steps, steps: new Intl.NumberFormat(language).format(steps) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
