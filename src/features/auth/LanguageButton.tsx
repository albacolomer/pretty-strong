import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, Icon } from '@/components/ui';
import { languages, setAppLanguage, useAppLanguage, type Language } from '@/lib/i18n';
import { inset, radius, spacing, touch, useTheme } from '@/theme';

// The pill's height; its tap area is grown to touch.min.
const PILL = 36;
const MENU_WIDTH = 200;

// "🌐 CA", a frosted pill in the corner of sign-in and sign-up, over the
// steel panel (US-02). It opens a small menu right under it (not at the bottom of the screen, far from the
// icon): Català, Español and English, the current one ticked. A tap
// outside closes it. It only switches the app: a new account is created in
// it, and once signed in the profile's language wins.
export function LanguageButton() {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const language = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const top = insets.top + spacing.sm;

  function pick(picked: Language) {
    setOpen(false);
    if (picked !== language) void setAppLanguage(picked);
  }

  return (
    <>
      {open ? (
        // Over the whole screen, so a tap anywhere else closes it.
        <Pressable
          accessible={false}
          onPress={() => setOpen(false)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Pressable
        role="button"
        aria-label={`${t('profile.language')}, ${t(`languages.${language}`)}`}
        onPress={() => setOpen(!open)}
        hitSlop={(touch.min - PILL) / 2}
        style={({ pressed }) => [
          styles.pill,
          { top, backgroundColor: colors.glass, borderColor: colors.glassBorder },
          pressed && styles.pressed,
        ]}>
        <Icon name="globe" size={15} weight="medium" tintColor={colors.onHero} />
        <Text variant="control" color="onHero">
          {language.toUpperCase()}
        </Text>
      </Pressable>
      {open ? (
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(100)}
          role="radiogroup"
          aria-label={t('profile.language')}
          style={[
            styles.menu,
            {
              top: top + PILL + spacing.sm,
              backgroundColor: colors.surface,
              boxShadow: shadows.card,
            },
          ]}>
          {languages.map((option, index) => {
            const selected = option === language;
            return (
              <Fragment key={option}>
                {index > 0 ? (
                  <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                ) : null}
                <Pressable
                  role="radio"
                  aria-checked={selected}
                  onPress={() => pick(option)}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <Text
                    variant={selected ? 'bodyStrong' : 'body'}
                    color={selected ? 'accent' : 'text'}
                    style={styles.label}>
                    {t(`languages.${option}`)}
                  </Text>
                  {selected ? (
                    <Icon
                      name="checkmark"
                      size={14}
                      weight="semibold"
                      tintColor={colors.accent}
                    />
                  ) : null}
                </Pressable>
              </Fragment>
            );
          })}
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: inset.screenX,
    height: PILL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  // Right under the icon, lined up with its right edge.
  menu: {
    position: 'absolute',
    right: inset.screenX,
    width: MENU_WIDTH,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
    paddingHorizontal: inset.cardX,
  },
  label: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: inset.cardX,
  },
  pressed: {
    opacity: 0.6,
  },
});
