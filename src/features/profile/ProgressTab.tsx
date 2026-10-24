import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { useHistoryEntries } from '@/features/history/useHistory';
import { formatDuration } from '@/features/routines/routine';
import { ROUTINE_ICONS } from '@/features/routines/routineIcons';
import { SPORT_ICONS } from '@/features/schedule/sports';
import { fromDateKey } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { useAppLanguage, type Language } from '@/lib/i18n';
import { radius, spacing, useTheme, type ColorToken } from '@/theme';

import {
  formatKm,
  formatVolume,
  monthSoFar,
  trainingMix,
  weeklySeries,
  type MixItem,
} from './progress';
import { useWeeklyGoal } from './useWeeklyGoal';
import { WeeklyChart } from './WeeklyChart';

// Profile → Progress (US-26): workouts per week against the goal, this
// month so far against the same days of last month, and what kind of
// training it's been.
export function ProgressTab() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const today = useToday();
  const goal = useWeeklyGoal();
  const history = useHistoryEntries();

  if (history.isPending) return <ActivityIndicator color={colors.accent} />;
  if (history.isError) return <Text color="danger">{t('history.loadError')}</Text>;

  const month = monthSoFar(history.entries, today);
  const { current, previous } = month;
  const capitalise = (text: string) => text.charAt(0).toLocaleUpperCase(language) + text.slice(1);
  const monthName = capitalise(new Intl.DateTimeFormat(language, { month: 'long' }).format(today));
  const previousTo = fromDateKey(month.previousTo);
  const versus = t('progress.versus', {
    dayMonth: new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(previousTo),
    month: new Intl.DateTimeFormat(language, { month: 'long' }).format(previousTo),
    day: previousTo.getDate(),
  });
  const mix = trainingMix(month.entries);

  return (
    <View style={styles.page}>
      <Card>
        <View style={styles.cardHeader}>
          <Text variant="cardTitle" accessibilityRole="header" style={styles.grow}>
            {t('progress.perWeek')}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('progress.lastWeeks', { count: 6 })}
          </Text>
        </View>
        <WeeklyChart points={weeklySeries(history.entries, today)} goal={goal} />
      </Card>

      <View style={styles.cardHeader}>
        <Text variant="cardTitle" accessibilityRole="header" style={styles.grow}>
          {t('progress.soFar', { month: monthName })}
        </Text>
        <Text variant="caption" color="textMuted">
          {versus}
        </Text>
      </View>
      <View style={styles.tiles}>
        <Tile
          label={t('progress.time')}
          value={formatDuration(current.timeS)}
          change={change(current.timeS, previous.timeS, 60, (diff) => formatDuration(diff))}
        />
        <Tile
          label={t('progress.volume')}
          value={formatVolume(current.volumeKg, language)}
          change={change(current.volumeKg, previous.volumeKg, 1, (diff) =>
            formatVolume(diff, language),
          )}
        />
        <Tile
          label={t('progress.run')}
          value={formatKm(current.runDistanceM, language)}
          change={change(current.runDistanceM, previous.runDistanceM, 50, (diff) =>
            formatKm(diff, language),
          )}
        />
        <Tile
          label={t('progress.average')}
          value={current.averageS === null ? '–' : formatDuration(current.averageS)}
          // Longer isn't better or worse here, so it's not coloured.
          change={
            current.averageS === null || previous.averageS === null
              ? null
              : {
                  ...change(current.averageS, previous.averageS, 60, (diff) =>
                    formatDuration(diff),
                  )!,
                  color: 'textMuted',
                }
          }
        />
      </View>

      <Card style={styles.mix}>
        <View style={styles.cardHeader}>
          <Text variant="cardTitle" accessibilityRole="header" style={styles.grow}>
            {t('progress.mix')}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('progress.mixCount', { count: month.entries.length })}
          </Text>
        </View>
        {mix.length === 0 ? (
          <Text color="textMuted">{t('progress.mixEmpty')}</Text>
        ) : (
          mix.map((item) => (
            <MixRow
              key={item.sportName ?? item.sport ?? item.customLabel ?? item.label ?? 'none'}
              item={item}
              total={month.entries.length}
              language={language}
            />
          ))
        )}
      </Card>
    </View>
  );

  // "↑ 1 h 10 min" when it grew, "↓ …" when it shrank, "Igual" within
  // `same`; nothing when there's nothing either time.
  function change(
    now: number,
    before: number,
    same: number,
    format: (difference: number) => string,
  ): { text: string; color: ColorToken } | null {
    if (now === 0 && before === 0) return null;
    const difference = now - before;
    if (Math.abs(difference) < same) return { text: t('progress.same'), color: 'textMuted' };
    return difference > 0
      ? { text: `↑ ${format(difference)}`, color: 'up' }
      : { text: `↓ ${format(-difference)}`, color: 'down' };
  }
}

function Tile({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: { text: string; color: ColorToken } | null;
}) {
  return (
    <Card
      style={styles.tile}
      accessible
      aria-label={[label, value, change?.text].filter(Boolean).join(': ')}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="cardTitle">{value}</Text>
      {change ? (
        <Text variant="caption" color={change.color}>
          {change.text}
        </Text>
      ) : null}
    </Card>
  );
}

function MixRow({ item, total, language }: { item: MixItem; total: number; language: Language }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const name =
    item.sportName ??
    (item.sport ? t(`sports.${item.sport}`) : null) ??
    item.customLabel ??
    (item.label ? t(`routines.labels.${item.label}`) : t('history.noRoutine'));
  const share = total > 0 ? item.count / total : 0;

  return (
    <View
      style={styles.mixRow}
      accessible
      aria-label={t('progress.mixItem', { name, count: item.count })}>
      <View style={styles.mixLabel}>
        <SymbolView
          name={item.sport ? SPORT_ICONS[item.sport] : ROUTINE_ICONS[item.label ?? 'none']}
          size={16}
          tintColor={colors.accent}
        />
        <Text style={styles.grow}>{name}</Text>
        <Text variant="bodyStrong">{new Intl.NumberFormat(language).format(item.count)}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.accentSoft }]}>
        <View
          style={[styles.bar, { backgroundColor: colors.accent, width: `${share * 100}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: -spacing.sm,
  },
  tile: {
    flexBasis: '40%',
    flexGrow: 1,
    gap: spacing.xs,
  },
  mix: {
    gap: spacing.md,
  },
  mixRow: {
    gap: spacing.xs,
  },
  mixLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
