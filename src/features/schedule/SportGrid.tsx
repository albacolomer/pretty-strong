import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, Icon, type IconName } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { PLANNABLE_SPORTS, SPORT_ICONS, type Sport } from './sports';

// The sports, three to a row, to pick one: planning it on a day (the
// plannable ones), or logging one done today (all of them, Caminar and
// Estiraments too).
export function SportGrid({
  value,
  onChange,
  sports = PLANNABLE_SPORTS,
}: {
  value: Sport | null;
  onChange: (sport: Sport) => void;
  sports?: readonly Sport[];
}) {
  const { t } = useTranslation();
  return (
    <View role="radiogroup" aria-label={t('schedule.sport')} style={styles.grid}>
      {sports.map((sport) => (
        <IconChoice
          key={sport}
          icon={SPORT_ICONS[sport]}
          label={t(`sports.${sport}`)}
          selected={sport === value}
          onPress={() => onChange(sport)}
        />
      ))}
    </View>
  );
}

// One option: an icon and its name; the chosen one is pink with a ✓. A
// tile in a grid, or a wide row in a list.
export function IconChoice({
  icon,
  label,
  selected,
  onPress,
  wide = false,
}: {
  icon: IconName;
  label: string;
  selected: boolean;
  onPress: () => void;
  wide?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onPress={onPress}
      style={({ pressed }) => [
        wide ? styles.wide : styles.tile,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.accentSoft : colors.surface,
        },
        pressed && styles.pressed,
      ]}>
      <Icon
        name={icon}
        size={22}
        weight="light"
        tintColor={selected ? colors.accent : colors.textSecondary}
      />
      <Text variant="bodyStrong" numberOfLines={1} style={wide ? styles.wideLabel : undefined}>
        {label}
      </Text>
      {selected ? (
        <View style={[styles.check, { backgroundColor: colors.accent }]}>
          <Icon name="checkmark" size={10} weight="bold" tintColor={colors.onAccent} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 76,
    borderWidth: 1.5,
    borderRadius: radius.input,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  wide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
    borderWidth: 1.5,
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
  },
  wideLabel: {
    flex: 1,
  },
  check: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
