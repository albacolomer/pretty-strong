import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { formatDuration } from '@/features/routines/routine';
import { formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { countSets } from '@/features/workout/activeWorkout';
import { useWorkoutStore } from '@/features/workout/workoutStore';
import { useAppLanguage } from '@/lib/i18n';
import { spacing, useTheme } from '@/theme';

import { groupByMonth, type HistoryEntry } from './pastWorkout';
import { useHistory } from './useHistory';

type Row = HistoryEntry & { pending: boolean };

// The History tab (US-23, spec: History): workouts by month, newest first,
// loading more as you scroll. A workout finished with no signal shows at
// the top until it's saved.
export function HistoryList() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const history = useHistory();
  const waiting = useWorkoutStore((state) => state.pending);

  const pending: Row[] = waiting.map((workout) => ({
    id: workout.id,
    date: workout.date,
    routineName: workout.routineName,
    logMode: 'live',
    durationS: Math.round(
      (new Date(workout.endedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000,
    ),
    exercises: workout.exercises.filter((exercise) =>
      exercise.sets.some((set) => set.completedAt !== null),
    ).length,
    sets: countSets(workout).done,
    pending: true,
  }));
  const saved: Row[] = (history.data?.pages.flat() ?? [])
    .filter((entry) => !waiting.some((workout) => workout.id === entry.id))
    .map((entry) => ({ ...entry, pending: false }));
  const sections = groupByMonth([...pending, ...saved], language);

  function renderEmpty() {
    if (history.isPending) return <ActivityIndicator color={colors.accent} />;
    if (history.isError) {
      return (
        <View style={styles.gap}>
          <Text color="danger">{t('history.loadError')}</Text>
          <Button
            label={t('history.retry')}
            variant="secondary"
            onPress={() => void history.refetch()}
          />
        </View>
      );
    }
    return (
      <Card>
        <Text color="textMuted">{t('history.empty')}</Text>
      </Card>
    );
  }

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      // iOS adds the status bar and tab bar insets, as on the other tabs.
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(row) => row.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {t('tabs.history')}
        </Text>
      }
      ListEmptyComponent={renderEmpty()}
      renderSectionHeader={({ section }) => (
        <Text variant="bodyStrong" color="textMuted" accessibilityRole="header" style={styles.month}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => <HistoryRow row={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      onEndReached={() => {
        if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
      }}
      ListFooterComponent={
        history.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : null
      }
    />
  );
}

function HistoryRow({ row }: { row: Row }) {
  const { t } = useTranslation();
  const language = useAppLanguage();
  const name = row.routineName ?? t('history.noRoutine');
  const details = [
    row.durationS === null ? null : formatDuration(row.durationS),
    row.exercises > 0 ? t('history.exercises', { count: row.exercises }) : null,
    row.sets > 0 ? t('history.sets', { count: row.sets }) : null,
    row.logMode === 'quick' && row.sets === 0 ? t('history.quick') : null,
    row.pending ? t('history.pending') : null,
  ].filter((part) => part !== null);

  const content = (
    <Card>
      <Text variant="caption" color="textMuted">
        {formatDayTitle(fromDateKey(row.date), language)}
      </Text>
      <Text variant="bodyStrong">{name}</Text>
      {details.length > 0 ? (
        <Text variant="caption" color={row.pending ? 'accent' : 'textMuted'}>
          {details.join(' · ')}
        </Text>
      ) : null}
    </Card>
  );

  // Not in the database yet, so there's nothing to open.
  if (row.pending) return content;
  return (
    <Pressable
      role="button"
      aria-label={t('history.open', { name, date: formatDayTitle(fromDateKey(row.date), language) })}
      onPress={() => router.push({ pathname: '/history/[sessionId]', params: { sessionId: row.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  month: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  gap: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
