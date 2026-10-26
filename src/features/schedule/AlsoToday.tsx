import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

export type AlsoTodayItem = {
  key: string;
  icon: SFSymbol;
  name: string;
  details: string;
  state: 'open' | 'done' | 'skipped';
  // The circle: mark it done, or (once logged) its "Desfés".
  onCheck: () => void;
  // The row: its other actions.
  onPress: () => void;
};

// "També avui": the day's other activities, each with a circle to mark it
// done, and a dashed + to log another one.
export function AlsoToday({ items, onAdd }: { items: AlsoTodayItem[]; onAdd: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text variant="bodyStrong" color="textMuted" accessibilityRole="header">
        {t('today.alsoToday')}
      </Text>
      <View style={styles.layout}>
        <View style={styles.list}>
          {items.length === 0 ? (
            <Text color="textMuted">{t('today.nothingElse')}</Text>
          ) : (
            items.map((item) => <Row key={item.key} item={item} />)
          )}
        </View>
        <Pressable
          role="button"
          aria-label={t('today.addActivity')}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.add,
            { borderColor: colors.textMuted },
            pressed && styles.pressed,
          ]}>
          <SymbolView name="plus" size={22} tintColor={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function Row({ item }: { item: AlsoTodayItem }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const logged = item.state !== 'open';

  return (
    <Card style={styles.row}>
      <Pressable
        role="button"
        aria-label={t('today.optionsFor', { name: item.name })}
        onPress={item.onPress}
        style={({ pressed }) => [styles.what, pressed && styles.pressed]}>
        <SymbolView name={item.icon} size={20} tintColor={colors.text} />
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {item.name}
          </Text>
          {item.details !== '' ? (
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {item.details}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        role="checkbox"
        aria-checked={item.state === 'done'}
        aria-label={t('today.doneFor', { name: item.name })}
        onPress={item.onCheck}
        style={({ pressed }) => [styles.check, pressed && styles.pressed]}>
        <View
          style={[
            styles.circle,
            { borderColor: logged ? colors.accent : colors.textMuted },
            item.state === 'done' && { backgroundColor: colors.accent },
          ]}>
          {item.state === 'done' ? (
            <SymbolView name="checkmark" size={14} tintColor={colors.onAccent} />
          ) : item.state === 'skipped' ? (
            <SymbolView name="forward.end" size={12} tintColor={colors.accent} />
          ) : null}
        </View>
      </Pressable>
    </Card>
  );
}

const CIRCLE = 32;

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  layout: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  list: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  what: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
  },
  text: {
    flex: 1,
  },
  check: {
    width: touch.check,
    height: touch.check,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 72,
    height: 72,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
