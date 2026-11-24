import { SymbolView } from 'expo-symbols';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

const CHECK = 24;

// A card of options, one of which can be picked, each with a round tick on
// the right (screen readers hear a group of radio buttons). Tapping the
// picked one again unpicks it.
export function ChoiceList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  // For screen readers, e.g. "Gènere".
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  const { colors } = useTheme();

  return (
    <Card role="radiogroup" aria-label={label} style={styles.card}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Fragment key={option.value}>
            {index > 0 ? (
              <View style={[styles.separator, { backgroundColor: colors.separator }]} />
            ) : null}
            <Pressable
              role="radio"
              aria-checked={selected}
              onPress={() => onChange(selected ? null : option.value)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text variant="bodyStrong" color={selected ? 'accent' : 'text'} style={styles.label}>
                {option.label}
              </Text>
              <View
                style={[
                  styles.check,
                  selected
                    ? { backgroundColor: colors.accent, borderColor: colors.accent }
                    : { borderColor: colors.control },
                ]}>
                {selected ? (
                  <SymbolView name="checkmark" size={12} weight="bold" tintColor={colors.onAccent} />
                ) : null}
              </View>
            </Pressable>
          </Fragment>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min + spacing.xs,
  },
  label: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  check: {
    width: CHECK,
    height: CHECK,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
