import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';

import { colors, type ColorScheme } from './colors';

function makeNavigationTheme(scheme: ColorScheme): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = colors[scheme];

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.surfaceRaised,
      notification: c.accent,
    },
  };
}

// Navigators paint their own backgrounds (behind screens, during
// transitions). Feeding them our tokens avoids white flashes in dark mode.
export const navigationThemes: Record<ColorScheme, NavigationTheme> = {
  dark: makeNavigationTheme('dark'),
  light: makeNavigationTheme('light'),
};
