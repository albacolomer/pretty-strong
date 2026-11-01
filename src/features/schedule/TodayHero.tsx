import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientText, IconButton, MetalFill, Text } from '@/components/ui';
import { gaps, metalTextShadows, useTheme } from '@/theme';

import { WeekRing } from './WeekRing';

// The ring and the button in it; "Tot fet" (DayDone) uses the same.
export const RING = 228;
export const BUTTON = 182;

export type HeroAction = { aria: string; icon: SFSymbol; onPress: () => void };

// The design's icons are a touch bigger for the eye than for the arrows.
const ICON_SIZES: Partial<Record<SFSymbol, number>> = { eye: 18 };

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
  // The big button: GO (to start or go back to it) or a ✓ (a class or a
  // sport, marked done), with a caption under it. Null once it's logged.
  main: { kind: 'go' | 'done'; caption: string; aria: string; onPress: () => void } | null;
  // Once logged: how it went ("✓ Fet · 1 h" or "Saltat"), and its ⋯.
  status: { label: string; text: string; skipped: boolean; onPress: () => void } | null;
  actions: HeroAction[];
};

// The middle of Avui: the day's main activity as a big metal button inside
// the week's ring, its name and what it is, then Previsualitza / Canvia /
// Salta as small round buttons.
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
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();

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
              { boxShadow: shadows.hero },
              pressed && styles.pressed,
            ]}>
            <MetalFill borderRadius={BUTTON / 2} />
            {main.kind === 'go' ? (
              <Text variant="hero" color="onMetal" style={metalTextShadows.large}>
                {t('today.go')}
              </Text>
            ) : (
              <SymbolView name="checkmark" size={52} weight="semibold" tintColor={colors.onMetal} />
            )}
            <Text
              variant="label"
              color="onMetal"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.caption, metalTextShadows.small]}>
              {main.caption}
            </Text>
          </Pressable>
        ) : status ? (
          <Pressable
            role="button"
            aria-label={status.label}
            onPress={status.onPress}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.surface, boxShadow: shadows.hero },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={status.skipped ? 'forward.end' : 'checkmark'}
              size={44}
              weight="light"
              tintColor={status.skipped ? colors.textMuted : colors.accent}
            />
          </Pressable>
        ) : null}
      </WeekRing>
      <Text variant="caption" color="textMuted">
        {progress}
      </Text>

      <View style={styles.what}>
        <GradientText variant="title" accessibilityRole="header" style={styles.centred}>
          {name}
        </GradientText>
        {insteadOf ? (
          <Text variant="caption" color="textMuted" style={styles.centred}>
            {insteadOf}
          </Text>
        ) : null}
        {details !== '' ? (
          <Text variant="caption" color="textMuted" style={styles.centred}>
            {details}
          </Text>
        ) : null}
        {status ? (
          <Text variant="captionMedium" color={status.skipped ? 'textMuted' : 'accent'}>
            {status.text}
          </Text>
        ) : null}
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <IconButton
              key={action.icon}
              icon={action.icon}
              iconSize={ICON_SIZES[action.icon] ?? 16}
              label={action.aria}
              onPress={action.onPress}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: gaps.loose,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: gaps.tight,
  },
  // Kept inside the circle, however long the translation.
  caption: {
    maxWidth: BUTTON - 24,
  },
  what: {
    alignItems: 'center',
    gap: gaps.tight,
  },
  centred: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: gaps.wide,
  },
  pressed: {
    opacity: 0.75,
  },
});
