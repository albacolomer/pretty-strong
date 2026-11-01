import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { ROUTINE_ICONS } from '@/features/routines/routineIcons';
import { SPORT_ICONS } from '@/features/schedule/sports';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, touch, useTheme } from '@/theme';

import { entryDetails, formatShortDate, type HistoryEntry } from './entries';

// One past workout in a list (spec: Past workouts): its type's icon, name,
// date and what it was, e.g. "dc., 21 d’oct. · 1 h 32 min · 7.240 kg". A
// tap opens it; one waiting for signal can't be opened yet.
export function WorkoutRow({ entry }: { entry: HistoryEntry }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const name =
    entry.sportName ??
    (entry.sport ? t(`sports.${entry.sport}`) : null) ??
    entry.routineName ??
    t('history.noRoutine');
  const date = formatShortDate(entry.date, language);
  const details = [
    date,
    ...entryDetails(entry, language, {
      stations: (count) => t('history.stations', { count }),
      sets: (count) => t('history.sets', { count }),
      quick: t('history.quick'),
    }),
  ].join(' · ');

  return (
    <Pressable
      role="button"
      aria-label={t('history.open', { name, date })}
      disabled={entry.pending}
      onPress={() =>
        router.push({ pathname: '/profile/history/[sessionId]', params: { sessionId: entry.id } })
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <SymbolView
          name={entry.sport ? SPORT_ICONS[entry.sport] : ROUTINE_ICONS[entry.routineLabel ?? 'none']}
          size={20}
          weight="light"
          tintColor={colors.accent}
        />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color={entry.pending ? 'accent' : 'textMuted'} numberOfLines={1}>
          {entry.pending ? `${details} · ${t('history.pending')}` : details}
        </Text>
      </View>
      {entry.pending ? null : (
        <Text variant="cardTitle" color="textMuted" aria-hidden>
          ›
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
    paddingVertical: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
