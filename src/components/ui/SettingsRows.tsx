import { Icon, type IconName } from './Icon';
import { Children, Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { gaps, radius, spacing, touch, useTheme } from '@/theme';

import { Card } from './Card';
import { Text } from './Text';

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
  icon: IconName;
  // Blue for what the row is mainly about; grey for extras; red to delete.
  tone?: 'accent' | 'muted' | 'danger';
  label: string;
  // A second, smaller line under the label: "kg · reps".
  detail?: string;
  // On the right: "Força", the start of a note.
  value?: string;
  // On the right in the accent colour, instead of a value: "Canvia".
  action?: string;
  // With no value, "Opcional" on the right.
  optional?: boolean;
  // On the right instead of the value and ›, e.g. a switch.
  accessory?: ReactNode;
  // Already translated, shown under the row in red.
  error?: string;
  // Makes the row a button with a ›.
  onPress?: () => void;
  // What VoiceOver says for the button; its label and value unless said.
  'aria-label'?: string;
  // A small button of its own at the end of the row, instead of the ›.
  trailing?: ReactNode;
  // Under the label, the card's full width: the weekdays, a stepper.
  children?: ReactNode;
};

// One setting: an icon in a tile, its label, and its value or what's
// under it, e.g. "Tipus · Força ›".
export function SettingsRow({
  icon,
  tone = 'accent',
  label,
  detail,
  value,
  action,
  optional = false,
  accessory,
  error,
  onPress,
  'aria-label': ariaLabel,
  trailing,
  children,
}: SettingsRowProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const line = (
    <>
      <View
        style={[
          styles.icon,
          { backgroundColor: tone === 'accent' ? colors.accentSoft : colors.surfaceRaised },
        ]}>
        <Icon
          name={icon}
          size={17}
          weight="medium"
          tintColor={
            tone === 'accent'
              ? colors.accent
              : tone === 'danger'
                ? colors.danger
                : colors.textSecondary
          }
        />
      </View>
      {/* With a switch the label takes the room; otherwise the value does. */}
      <View style={accessory ? styles.grow : styles.shrink}>
        <Text variant="bodyStrong" color={tone === 'danger' ? 'danger' : 'text'}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" color="textMuted">
            {detail}
          </Text>
        ) : null}
      </View>
      {accessory ?? (
        <View style={styles.right}>
          {action ? (
            <Text variant="bodyStrong" color="accent">
              {action}
            </Text>
          ) : value ? (
            <Text color="textMuted" numberOfLines={1} style={styles.shrink}>
              {value}
            </Text>
          ) : optional ? (
            <Text variant="caption" color="textMuted">
              {t('common.optional')}
            </Text>
          ) : null}
          {onPress && !trailing ? (
            <Icon
              name="chevron.right"
              size={13}
              weight="semibold"
              tintColor={colors.control}
            />
          ) : null}
        </View>
      )}
    </>
  );

  const main = onPress ? (
    <Pressable
      role="button"
      aria-label={
        ariaLabel ??
        [label, value ?? (optional ? t('common.optional') : undefined)].filter(Boolean).join(', ')
      }
      onPress={onPress}
      style={({ pressed }) => [styles.line, pressed && styles.pressed]}>
      {line}
    </Pressable>
  ) : (
    <View style={styles.line}>{line}</View>
  );

  return (
    <View style={styles.row}>
      {/* Always this shape, so a trailing button showing up doesn't rebuild the row. */}
      <View style={styles.withTrailing}>
        <View style={styles.grow}>{main}</View>
        {trailing}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
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
  withTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: radius.input,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  // Takes the rest of the line, so a long value is cut short on the right.
  right: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  // Lined up with the label.
  error: {
    marginLeft: ICON + gaps.loose,
  },
  pressed: {
    opacity: 0.75,
  },
});
