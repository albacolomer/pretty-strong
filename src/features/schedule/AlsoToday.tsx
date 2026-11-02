import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, GradientText, Text } from '@/components/ui';
import { gaps, radius, spacing, touch, useTheme } from '@/theme';

export type AlsoTodayItem = {
  key: string;
  icon: SFSymbol;
  // When it starts, e.g. "20:30", if it has a set time.
  time: string | null;
  name: string;
  // Under the name, if there's more to say: "45 min", "✓ Fet · 45 min".
  details: string;
  state: 'open' | 'done' | 'skipped';
  // The circle: mark it done, or (once logged) its "Desfés".
  onCheck: () => void;
  // The row: its other actions.
  onPress: () => void;
};

// Drawn at the design's sizes; the tap areas are grown to touch.min and
// touch.check.
const ROW = 60;
const ADD_ROW = 44;
const CHECK = 44;
const CIRCLE = 22;
const TIME = 56;
// How close the ✓ comes to the card's right edge.
const CHECK_EDGE = 6;

// "També avui": a card with the day's other activities, each with its
// time (if it has one), its name and a circle to mark it done, and a last
// row to log another one.
export function AlsoToday({ items, onAdd }: { items: AlsoTodayItem[]; onAdd: () => void }) {
  const { t } = useTranslation();
  // A column for start times when any has one, so the names line up.
  const timed = items.some((item) => item.time !== null);

  return (
    <Card style={styles.card}>
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {t('today.alsoToday')}
      </Text>
      {items.length === 0 ? (
        <View style={styles.row}>
          <Text color="textMuted">{t('today.nothingElse')}</Text>
        </View>
      ) : (
        items.map((item) => <Row key={item.key} item={item} timed={timed} />)
      )}
      <AddActivityRow onPress={onAdd} />
    </Card>
  );
}

// The last row of a card of the day's activities: "+ Registra una altra
// activitat", under a hairline.
export function AddActivityRow({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      role="button"
      onPress={onPress}
      hitSlop={(touch.min - ADD_ROW) / 2}
      style={({ pressed }) => [
        styles.add,
        { borderTopColor: colors.separator },
        pressed && styles.pressed,
      ]}>
      <SymbolView name="plus" size={14} weight="medium" tintColor={colors.textMuted} />
      <Text variant="label" color="textMuted" numberOfLines={1} style={styles.addLabel}>
        {t('today.addActivity')}
      </Text>
    </Pressable>
  );
}

function Row({ item, timed }: { item: AlsoTodayItem; timed: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        role="button"
        aria-label={t('today.optionsFor', { name: item.name })}
        onPress={item.onPress}
        style={({ pressed }) => [styles.what, pressed && styles.pressed]}>
        {timed ? (
          <>
            <View style={styles.time}>
              {item.time ? (
                <GradientText variant="time" numberOfLines={1}>
                  {item.time}
                </GradientText>
              ) : null}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </>
        ) : null}
        <View style={styles.name}>
          <SymbolView name={item.icon} size={18} weight="light" tintColor={colors.textMuted} />
          <View style={styles.text}>
            <Text variant="name" color="textMuted" numberOfLines={1}>
              {item.name}
            </Text>
            {item.details !== '' ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {item.details}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        role="checkbox"
        aria-checked={item.state === 'done'}
        aria-label={t('today.doneFor', { name: item.name })}
        onPress={item.onCheck}
        hitSlop={(touch.check - CHECK) / 2}
        style={({ pressed }) => [styles.check, pressed && styles.pressed]}>
        <View
          style={[
            styles.circle,
            { borderColor: item.state === 'done' ? colors.accent : colors.control },
            item.state === 'done' && { backgroundColor: colors.accent },
          ]}>
          {item.state === 'done' ? (
            <SymbolView name="checkmark" size={11} weight="bold" tintColor={colors.onAccent} />
          ) : item.state === 'skipped' ? (
            <SymbolView name="forward.end" size={9} tintColor={colors.textMuted} />
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // The row's ✓ sits close to the card's right edge, and the last row
  // reaches its bottom.
  card: {
    paddingRight: CHECK_EDGE,
    paddingBottom: 0,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: gaps.loose,
    minHeight: ROW,
  },
  what: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: gaps.loose,
    minHeight: ROW,
  },
  time: {
    width: TIME,
  },
  divider: {
    width: 1,
    height: 30,
  },
  name: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
  },
  check: {
    width: CHECK,
    height: CHECK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    height: ADD_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  addLabel: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
