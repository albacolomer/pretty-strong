import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientText, Text, Icon } from '@/components/ui';
import { streakWeeks, weeklyCounts } from '@/features/history/entries';
import { useHistoryEntries } from '@/features/history/useHistory';
import { dateKey, startOfWeek } from '@/features/schedule/dates';
import { countsAsWorkout } from '@/features/schedule/sports';
import { useToday } from '@/features/schedule/useToday';
import { gaps, radius, spacing, touch, useTheme } from '@/theme';

import { Avatar } from './Avatar';
import { useProfile } from './useProfile';
import { useWeeklyGoal } from './useWeeklyGoal';

// The top of Profile: your picture (or initial), name, city and bio, then workouts in all,
// the streak (weeks in a row at 75% of the goal or more) and this week
// against the goal (walks and stretching left out); "Edita el perfil"
// under them.
export function ProfileHeader({ onEdit }: { onEdit: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const today = useToday();
  const { data: profile } = useProfile();
  const { entries } = useHistoryEntries();

  const name = profile?.display_name || (profile ? `@${profile.username}` : '');
  const goal = useWeeklyGoal();
  const counts = weeklyCounts(entries);
  const thisWeek = counts.get(dateKey(startOfWeek(today))) ?? 0;
  const streak = streakWeeks(counts, goal, today);

  const stats = [
    { value: String(entries.filter(countsAsWorkout).length), label: t('profile.workouts') },
    { value: t('profile.streakValue', { count: streak }), label: t('profile.streak') },
    {
      value: goal === null ? String(thisWeek) : `${thisWeek} / ${goal}`,
      label: t('profile.thisWeek'),
    },
  ];

  return (
    <View style={styles.header}>
      <Avatar profile={profile} />
      <View style={styles.identity}>
        <GradientText variant="title" accessibilityRole="header" style={styles.centred}>
          {name}
        </GradientText>
        {profile?.city ? (
          <Text variant="caption" color="textMuted">
            {profile.city}
          </Text>
        ) : null}
        {profile?.bio ? (
          <Text color="textSecondary" style={styles.centred}>
            {profile.bio}
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
              index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.border },
            ]}>
            <GradientText variant="cardTitle">{stat.value}</GradientText>
            <Text variant="caption" color="textMuted">
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <Pressable
        role="button"
        onPress={onEdit}
        // Drawn thin; the tap area still reaches touch.min.
        hitSlop={(touch.min - EDIT_HEIGHT) / 2}
        style={({ pressed }) => [
          styles.edit,
          { backgroundColor: colors.surface, borderColor: colors.border },
          pressed && styles.pressed,
        ]}>
        <Icon name="pencil" size={14} weight="light" tintColor={colors.textSecondary} />
        <Text variant="control">{t('profile.edit')}</Text>
      </Pressable>
    </View>
  );
}

const EDIT_HEIGHT = 36;

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.md,
  },
  identity: {
    alignItems: 'center',
    gap: gaps.tight,
  },
  centred: {
    textAlign: 'center',
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
    height: EDIT_HEIGHT,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.75,
  },
});
