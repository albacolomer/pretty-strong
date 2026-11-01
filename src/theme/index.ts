import { useColorScheme } from 'react-native';

import {
  colors,
  gradients,
  metalTextShadows,
  shadows,
  type ColorScheme,
} from './colors';
import { gaps, inset, radius, spacing, touch } from './spacing';
import { fonts, typography } from './typography';

export type {
  ColorScheme,
  ColorToken,
  Colors,
  Gradient,
  GradientName,
  ShadowName,
} from './colors';
export type { TypographyVariant } from './typography';
export { cssGradientPoints, type GradientPoint } from './gradient';
export {
  colors,
  fonts,
  gaps,
  gradients,
  inset,
  metalTextShadows,
  radius,
  shadows,
  spacing,
  touch,
  typography,
};

function makeTheme(scheme: ColorScheme) {
  return {
    scheme,
    colors: colors[scheme],
    gradients: gradients[scheme],
    shadows: shadows[scheme],
    typography,
    spacing,
    gaps,
    inset,
    radius,
    touch,
  };
}

export type Theme = ReturnType<typeof makeTheme>;

// Built once, so components get the same object on every render.
const themes: Record<ColorScheme, Theme> = {
  light: makeTheme('light'),
  dark: makeTheme('dark'),
};

// Light by default (the design); dark when the iPhone is set to dark.
export function useTheme(): Theme {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
