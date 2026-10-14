import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

export type SheetOption<T extends string> = { value: T; label: string; icon: ReactNode };
export type SheetGroup<T extends string> = { title?: string; options: SheetOption<T>[] };

type OptionSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  groups: SheetGroup<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  onClose: () => void;
  // Several options (checkboxes) or exactly one (radio buttons).
  multiple?: boolean;
  // The main button closes the sheet, e.g. "Mostra 12 resultats" or "Fet".
  doneLabel: string;
  // Optional secondary button, e.g. "Esborra els filtres".
  clear?: { label: string; onPress: () => void };
};

// A native iOS sheet (swipe down to close) with a grid of options to pick.
// Changes apply straight away; the main button just closes the sheet.
export function OptionSheet<T extends string>({
  visible,
  title,
  groups,
  selected,
  onToggle,
  onClose,
  multiple = true,
  doneLabel,
  clear,
}: OptionSheetProps<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={[styles.grabber, { backgroundColor: colors.surfaceRaised }]} />
          <Text variant="cardTitle" accessibilityRole="header">
            {title}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {groups.map((group, index) => (
            <View key={group.title ?? index} style={styles.group}>
              {group.title ? (
                <Text variant="caption" color="textMuted">
                  {group.title}
                </Text>
              ) : null}
              {pairs(group.options).map((pair) => (
                <View key={pair[0].value} style={styles.row}>
                  {pair.map((option) => (
                    <OptionCard
                      key={option.value}
                      option={option}
                      selected={selected.includes(option.value)}
                      multiple={multiple}
                      onPress={() => onToggle(option.value)}
                    />
                  ))}
                  {/* Keeps a lone last option at half width. */}
                  {pair.length === 1 ? <View style={styles.cell} /> : null}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { borderTopColor: colors.surfaceRaised, paddingBottom: insets.bottom + spacing.sm },
          ]}>
          {clear ? (
            <Button
              label={clear.label}
              variant="secondary"
              onPress={clear.onPress}
              style={styles.cell}
            />
          ) : null}
          <Button label={doneLabel} onPress={onClose} style={styles.cell} />
        </View>
      </View>
    </Modal>
  );
}

function OptionCard<T extends string>({
  option,
  selected,
  multiple,
  onPress,
}: {
  option: SheetOption<T>;
  selected: boolean;
  multiple: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      role={multiple ? 'checkbox' : 'radio'}
      aria-checked={selected}
      // Just the name: the body figure has its own built-in label, which
      // screen readers would otherwise read out too.
      aria-label={option.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        styles.card,
        {
          backgroundColor: selected ? colors.accentSoft : colors.surface,
          borderColor: selected ? colors.accent : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceRaised }]}>{option.icon}</View>
      <Text variant="bodyStrong" color={selected ? 'accent' : 'text'} style={styles.label}>
        {option.label}
      </Text>
    </Pressable>
  );
}

function pairs<T>(items: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += 2) result.push(items.slice(i, i + 2));
  return result;
}

const ICON_SIZE = 52;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: radius.pill,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  group: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
