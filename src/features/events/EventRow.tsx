import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, Icon } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { EVENT_ICONS, type CalendarEvent } from './events';
import { useEventName } from './useEventName';

// One event in the calendar's day card (US-30): its kind's icon in gold,
// its name, and under it the kind (when it has a name of its own), the
// place and the notes. A tap opens its menu.
export function EventRow({ event, onPress }: { event: CalendarEvent; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const nameOf = useEventName();
  const name = nameOf(event);
  const details = [event.name ? t(`events.kinds.${event.kind}`) : null, event.place]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      role="button"
      aria-label={t('events.optionsFor', { name })}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: colors.goldSoft }]}>
        <Icon name={EVENT_ICONS[event.kind]} size={20} weight="light" tintColor={colors.gold} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {details ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {details}
          </Text>
        ) : null}
        {event.notes ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {event.notes}
          </Text>
        ) : null}
      </View>
      <Text variant="cardTitle" color="textMuted" aria-hidden>
        ⋯
      </Text>
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
