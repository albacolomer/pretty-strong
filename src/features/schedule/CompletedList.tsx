import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, MetalFill, Text, Icon } from '@/components/ui';
import { gaps, radius, spacing, useTheme } from '@/theme';

import { AddActivityRow } from './AlsoToday';

export type CompletedItem = {
  key: string;
  name: string;
  // "18:10 · 1 h 24 min", or "Saltat · Falta de temps".
  details: string;
  // "+4 % vs l'última vegada", and whether it's more than last time.
  change: { text: string; up: boolean } | null;
  skipped: boolean;
  // A workout opens its page, a skip its "Desfés"; null while a workout
  // waits for signal (it has no page yet).
  onPress: (() => void) | null;
};

const ROW = 60;
const CHECK = 22;

// A done day's "COMPLETAT": each activity with a metal ✓ (or ⏭, greyed,
// for a skipped one), what it was, and how it went against last time,
// then a row to log another.
export function CompletedList({ items, onAdd }: { items: CompletedItem[]; onAdd: () => void }) {
  const { t } = useTranslation();

  return (
    <Card style={styles.card}>
      <Text variant="label" color="textMuted" accessibilityRole="header" style={styles.label}>
        {t('today.completed')}
      </Text>
      {items.map((item, index) => (
        <Row key={item.key} item={item} separator={index > 0} />
      ))}
      <AddActivityRow onPress={onAdd} />
    </Card>
  );
}

function Row({ item, separator }: { item: CompletedItem; separator: boolean }) {
  const { colors, shadows } = useTheme();

  return (
    <Pressable
      role="button"
      disabled={item.onPress === null}
      onPress={item.onPress ?? undefined}
      style={({ pressed }) => [
        styles.row,
        separator && { borderTopWidth: 1, borderTopColor: colors.separator },
        pressed && styles.pressed,
      ]}>
      {item.skipped ? (
        <View style={[styles.check, styles.skipped, { borderColor: colors.control }]}>
          <Icon name="forward.end" size={9} tintColor={colors.textMuted} />
        </View>
      ) : (
        <View style={[styles.check, { boxShadow: shadows.control }]}>
          <MetalFill borderRadius={CHECK / 2} />
          <Icon name="checkmark" size={10} weight="bold" tintColor={colors.onMetal} />
        </View>
      )}
      <View style={styles.text}>
        <Text variant="bodyStrong" color={item.skipped ? 'textMuted' : 'text'} numberOfLines={1}>
          {item.name}
        </Text>
        {item.details !== '' || item.change ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {item.details}
            {item.change ? (
              <Text variant="captionMedium" color={item.change.up ? 'accent' : 'textMuted'}>
                {item.details !== '' ? ' · ' : ''}
                {item.change.text}
              </Text>
            ) : null}
          </Text>
        ) : null}
      </View>
      {item.onPress ? (
        <Icon name="chevron.right" size={12} weight="light" tintColor={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The last row reaches the card's bottom.
  card: {
    paddingBottom: 0,
    gap: 0,
  },
  label: {
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: gaps.loose,
    minHeight: ROW,
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipped: {
    borderWidth: 1.5,
  },
  text: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
