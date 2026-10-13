import { useColorScheme } from 'react-native';

import { colors, type ColorScheme } from './colors';
import { radius, spacing, touch } from './spacing';
import { typography } from './typography';

export type { ColorScheme, ColorToken, Colors } from './colors';
export type { TypographyVariant } from './typography';
export { colors, radius, spacing, touch, typography };

function makeTheme(scheme: ColorScheme) {
  return { scheme, colors: colors[scheme], typography, spacing, radius, touch };
}

export type Theme = ReturnType<typeof makeTheme>;

// Built once, so components get the same object on every render.
const themes: Record<ColorScheme, Theme> = {
  dark: makeTheme('dark'),
  light: makeTheme('light'),
};

// The root layout forces dark, so this returns the dark theme. The light
// tokens stay so a light option can be added later.
export function useTheme(): Theme {
  return themes[useColorScheme() === 'light' ? 'light' : 'dark'];
}
