import { Pressable, StyleSheet } from 'react-native';

import { Text, Icon } from '@/components/ui';
import { inset, radius, spacing, touch, useTheme } from '@/theme';

type TomorrowCardProps = {
  // "DEMÀ", or the weekday when tomorrow is a rest day.
  day: string;
  // "Tren inferior 2", or several names: "Tren inferior 2 · Pàdel 19:00".
  name: string;
  // "~1 h 30 min", for one routine.
  details: string | null;
  // Opens the routine's preview; null when there's nothing to preview.
  onPress: (() => void) | null;
};

// What's next, at the end of a done day: a grey card, not a raised one.
export function TomorrowCard({ day, name, details, onPress }: TomorrowCardProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      role={onPress ? 'button' : undefined}
      disabled={onPress === null}
      onPress={onPress ?? undefined}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surfaceRaised },
        pressed && styles.pressed,
      ]}>
      <Text variant="label" color="textMuted">
        {day}
      </Text>
      <Text variant="control" numberOfLines={1} style={styles.plan}>
        {name}
        {details ? (
          <Text variant="caption" color="textMuted">
            {' · '}
            {details}
          </Text>
        ) : null}
      </Text>
      {onPress ? (
        <Icon name="chevron.right" size={12} weight="light" tintColor={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.check,
    paddingHorizontal: inset.cardX,
    borderRadius: radius.card,
    borderCurve: 'continuous',
  },
  plan: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
