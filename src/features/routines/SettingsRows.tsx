import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Children, Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { gaps, radius, spacing, touch, useTheme } from '@/theme';

const ICON = 36;

// A card of settings rows, with a line between them that starts where the
// labels do.
export function SettingsCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  // Rows that aren't shown (null) leave no line behind.
  const rows = Children.toArray(children);

  return (
    <Card style={styles.card}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View style={[styles.separator, { backgroundColor: colors.separator }]} />
          ) : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

type SettingsRowProps = {
  icon: SFSymbol;
  label: string;
  // On the right: "Força", the start of a note.
  value?: string;
  // With no value, "Opcional" on the right.
  optional?: boolean;
  // Makes the row a button with a ›.
  onPress?: () => void;
  'aria-label'?: string;
  // Under the label, the card's full width: the weekdays, a stepper.
  children?: ReactNode;
};

// One setting of a routine: an icon in a tile, its label, and its value
// or what's under it, e.g. "Tipus · Força ›".
export function SettingsRow({
  icon,
  label,
  value,
  optional = false,
  onPress,
  'aria-label': ariaLabel,
  children,
}: SettingsRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const line = (
    <>
      <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
        <SymbolView name={icon} size={17} weight="medium" tintColor={colors.accent} />
      </View>
      <Text variant="bodyStrong">{label}</Text>
      <View style={styles.right}>
        {value ? (
          <Text color="textMuted" numberOfLines={1} style={styles.value}>
            {value}
          </Text>
        ) : optional ? (
          <Text variant="caption" color="textMuted">
            {t('routines.editor.optional')}
          </Text>
        ) : null}
        {onPress ? (
          <SymbolView
            name="chevron.right"
            size={13}
            weight="semibold"
            tintColor={colors.control}
          />
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable
          role="button"
          aria-label={ariaLabel}
          onPress={onPress}
          style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
          {line}
        </Pressable>
      ) : (
        <View style={styles.line}>{line}</View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    paddingVertical: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: ICON + gaps.loose,
  },
  row: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: gaps.loose,
    minHeight: touch.min,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Takes the rest of the line, so a long note is cut short on the right.
  right: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  value: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
