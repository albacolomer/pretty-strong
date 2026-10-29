import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing, touch, useTheme } from '@/theme';

import { WeekRing } from './WeekRing';

// The ring and the button in it; "Tot fet" (DayDone) uses the same.
export const RING = 270;
export const BUTTON = 200;

export type HeroAction = { label: string; aria: string; icon: SFSymbol; onPress: () => void };

type TodayHeroProps = {
  // The week ring: the goal's segments, and how many are done.
  segments: number;
  done: number;
  // "3 de 6 entrenaments aquesta setmana".
  progress: string;
  name: string;
  // "En lloc de «…»", after a swap.
  insteadOf: string | null;
  details: string;
  // The big button: Comença, Reprèn or Fet. Null once it's logged.
  main: { label: string; aria: string; icon: SFSymbol; onPress: () => void } | null;
  // Once logged: how it went ("✓ Fet · 1 h" or "Saltat"), and its ⋯.
  status: { label: string; text: string; skipped: boolean; onPress: () => void } | null;
  actions: HeroAction[];
};

// The middle of Avui: the day's main activity in a big pink button inside
// the week's ring, its name and what it is, then Previsualitza / Canvia /
// Salta.
export function TodayHero({
  segments,
  done,
  progress,
  name,
  insteadOf,
  details,
  main,
  status,
  actions,
}: TodayHeroProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.hero}>
      <WeekRing size={RING} segments={segments} done={done}>
        {main ? (
          <Pressable
            role="button"
            aria-label={main.aria}
            onPress={main.onPress}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent, shadowColor: colors.accent },
              pressed && styles.pressed,
            ]}>
            <SymbolView name={main.icon} size={30} tintColor={colors.onAccent} />
            <Text variant="title" color="onAccent">
              {main.label}
            </Text>
          </Pressable>
        ) : status ? (
          <Pressable
            role="button"
            aria-label={status.label}
            onPress={status.onPress}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accentSoft },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={status.skipped ? 'forward.end' : 'checkmark'}
              size={34}
              tintColor={status.skipped ? colors.textMuted : colors.accent}
            />
          </Pressable>
        ) : null}
      </WeekRing>
      <Text variant="bodyStrong" color="textMuted">
        {progress}
      </Text>

      <View style={styles.what}>
        <Text variant="title" accessibilityRole="header" style={styles.centred}>
          {name}
        </Text>
        {insteadOf ? (
          <Text variant="caption" color="textMuted" style={styles.centred}>
            {insteadOf}
          </Text>
        ) : null}
        {details !== '' ? (
          <Text color="textMuted" style={styles.centred}>
            {details}
          </Text>
        ) : null}
        {status ? (
          <Text variant="bodyStrong" color={status.skipped ? 'textMuted' : 'accent'}>
            {status.text}
          </Text>
        ) : null}
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              role="button"
              aria-label={action.aria}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: colors.surfaceRaised },
                pressed && styles.pressed,
              ]}>
              <SymbolView name={action.icon} size={16} tintColor={colors.text} />
              <Text variant="bodyStrong">{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.md,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  what: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  centred: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.75,
  },
});
