export type ColorScheme = 'light' | 'dark';

const dark = {
  background: '#0F0B0E',
  surface: '#1B1519',
  surfaceRaised: '#261E23',
  text: '#F8F1F5',
  textMuted: '#B9A8B1',
  accent: '#FF7EB6',
  // #FF7EB6 at 15%
  accentSoft: 'rgba(255, 126, 182, 0.15)',
  onAccent: '#2B0F1C',
  up: '#7ED9A6',
  down: '#FFB86B',
  danger: '#FF6B6B',
};

export type ColorToken = keyof typeof dark;
export type Colors = Record<ColorToken, string>;

// Typed as Colors so light must define exactly the same tokens as dark.
const light: Colors = {
  background: '#FFF7FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FBEFF4',
  text: '#2A1E24',
  textMuted: '#7B6871',
  accent: '#E0508C',
  // #E0508C at 12%
  accentSoft: 'rgba(224, 80, 140, 0.12)',
  onAccent: '#FFFFFF',
  up: '#2E9E64',
  down: '#C9771F',
  danger: '#D64545',
};

export const colors: Record<ColorScheme, Colors> = { dark, light };
