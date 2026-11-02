import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card, GradientText, Text } from '@/components/ui';
import { dateKey, formatDayTitle, fromDateKey } from '@/features/schedule/dates';
import { useAppLanguage } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { daysUntil, EVENT_ICONS, nextEvent } from './events';
import { useEvents } from './useEvents';
import { useEventName } from './useEventName';

// At the end of Avui (US-30): the nearest competition or special date, its
// day and place, and the days left in big numbers ("12 dies"); "Demà" the
// day before and "Avui" on the day. Only the nearest one, however far it
// is; nothing when none is ahead.
export function EventCountdown({ today }: { today: Date }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = useAppLanguage();
  const nameOf = useEventName();
  const { data: events = [] } = useEvents();
  const todayKey = dateKey(today);
  const event = nextEvent(events, todayKey);
  if (!event) return null;

  const days = daysUntil(todayKey, event.date);
  const name = nameOf(event);
  const date = formatDayTitle(fromDateKey(event.date), language);
  const when =
    days === 0
      ? t('events.isToday')
      : days === 1
        ? t('events.isTomorrow')
        : t('events.inDays', { count: days });

  return (
    // Read as one: "Proper esdeveniment: HYROX Barcelona, …, d'aquí a 12 dies".
    <Card
      accessible
      aria-label={t('events.countdownAria', { name, date, when })}
      style={styles.card}>
      <View style={[styles.icon, { backgroundColor: colors.goldSoft }]}>
        <SymbolView name={EVENT_ICONS[event.kind]} size={22} weight="light" tintColor={colors.gold} />
      </View>
      <View style={styles.text}>
        <Text variant="label" color="textMuted">
          {t('events.countdownLabel')}
        </Text>
        <Text variant="name" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {[date, event.place].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {days > 1 ? (
        <View style={styles.days}>
          <GradientText variant="stat">{new Intl.NumberFormat(language).format(days)}</GradientText>
          <Text variant="caption" color="textMuted">
            {t('events.daysUnit', { count: days })}
          </Text>
        </View>
      ) : (
        <GradientText variant="name">{when}</GradientText>
      )}
    </Card>
  );
}

const ICON_SIZE = 44;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  days: {
    alignItems: 'center',
  },
});
