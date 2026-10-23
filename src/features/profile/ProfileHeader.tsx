import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { streakWeeks, weeklyCounts, weeklyGoal } from '@/features/history/entries';
import { useHistoryEntries } from '@/features/history/useHistory';
import { useRoutines } from '@/features/routines/useRoutines';
import { dateKey, startOfWeek } from '@/features/schedule/dates';
import { useToday } from '@/features/schedule/useToday';
import { radius, spacing, touch, useTheme } from '@/theme';

import { useProfile } from './useProfile';

// The top of Profile: avatar, name, city and focus, then workouts in all,
// the streak (weeks in a row at 75% of the goal or more) and this week
// against the goal; "Edita el perfil" under them.
export function ProfileHeader({ onEdit }: { onEdit: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = useToday();
  const { data: profile } = useProfile();
  const { data: routines = [] } = useRoutines();
  const { entries } = useHistoryEntries();

  const name = profile?.display_name || (profile ? `@${profile.username}` : '');
  const line = [profile?.city, profile?.focus].filter(Boolean).join(' · ');
  const goal = weeklyGoal(profile?.weekly_goal ?? null, routines);
  const counts = weeklyCounts(entries);
  const thisWeek = counts.get(dateKey(startOfWeek(today))) ?? 0;
  const streak = streakWeeks(counts, goal, today);

  const stats = [
    { value: String(entries.length), label: t('profile.workouts') },
    { value: t('profile.streakValue', { count: streak }), label: t('profile.streak') },
    {
      value: goal === null ? String(thisWeek) : `${thisWeek} / ${goal}`,
      label: t('profile.thisWeek'),
    },
  ];

  return (
    <View style={styles.header}>
      <View
        style={[styles.avatar, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}
        aria-hidden>
        <Text variant="display" color="accent">
          {(profile?.display_name || profile?.username || '').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.identity}>
        <Text variant="cardTitle" accessibilityRole="header">
          {name}
        </Text>
        {line ? (
          <Text variant="caption" color="textMuted">
            {line}
          </Text>
        ) : null}
      </View>

      <View style={styles.stats}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            accessible
            aria-label={`${stat.label}: ${stat.value}`}
            style={[
              styles.stat,
              index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.textMuted },
            ]}>
            <Text variant="cardTitle">{stat.value}</Text>
            <Text variant="caption" color="textMuted">
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        role="button"
        onPress={onEdit}
        style={({ pressed }) => [
          styles.edit,
          { backgroundColor: colors.surfaceRaised },
          pressed && styles.pressed,
        ]}>
        <SymbolView name="pencil" size={16} tintColor={colors.text} />
        <Text variant="bodyStrong">{t('profile.edit')}</Text>
      </Pressable>
    </View>
  );
}

const AVATAR_SIZE = 104;

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: 2,
  },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  edit: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.75,
  },
});
