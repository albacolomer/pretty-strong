import type { TextStyle } from 'react-native';

export type ColorScheme = 'light' | 'dark';

// Brushed steel blue on warm white, from the Today design. Light is the
// design itself; dark is derived from it.
const light = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  // Inputs, chips, tracks: a step off white.
  surfaceRaised: '#F2F2F0',
  text: '#3A3A3C',
  // Icons and names a step down from the main text.
  textSecondary: '#48484A',
  textMuted: '#707075',
  accent: '#4A7192',
  // #4A7192 at 12%
  accentSoft: 'rgba(74, 113, 146, 0.12)',
  // On a plain accent fill (a ticked circle, a selected chip).
  onAccent: '#FFFFFF',
  // On the metal gradient (the GO button, primary buttons).
  onMetal: '#F4F8FB',
  // Hairlines: the week ring's track, dividers.
  border: '#EDEDEB',
  // Between the rows of a card.
  separator: '#F0F0EE',
  // An empty ✓ circle's outline.
  control: '#C7C7C5',
  // A progress bar's empty part.
  track: '#E9F0F5',
  // Dims the screen behind a menu.
  scrim: 'rgba(20, 30, 40, 0.32)',
  up: '#2E9E64',
  down: '#C9771F',
  danger: '#D64545',
  // Competitions and special dates: the ★ on their day, their icons.
  // 3.2:1 on white, enough for an icon.
  gold: '#B8860B',
  // #B8860B at 12%
  goldSoft: 'rgba(184, 134, 11, 0.12)',
};

export type ColorToken = keyof typeof light;
export type Colors = Record<ColorToken, string>;

// Typed as Colors so dark must define exactly the same tokens as light.
const dark: Colors = {
  background: '#121416',
  surface: '#1C1F22',
  surfaceRaised: '#272B2F',
  text: '#ECEEF0',
  textSecondary: '#C9CCD0',
  textMuted: '#9A9EA4',
  accent: '#8FB4D1',
  // #8FB4D1 at 16%
  accentSoft: 'rgba(143, 180, 209, 0.16)',
  onAccent: '#0F1E2A',
  onMetal: '#F4F8FB',
  border: '#2E3236',
  separator: '#26292D',
  control: '#5A5E64',
  track: '#26343F',
  scrim: 'rgba(0, 0, 0, 0.55)',
  up: '#7ED9A6',
  down: '#FFB86B',
  danger: '#FF6B6B',
  gold: '#E6C25A',
  // #E6C25A at 16%
  goldSoft: 'rgba(230, 194, 90, 0.16)',
};

export const colors: Record<ColorScheme, Colors> = { light, dark };

// A CSS linear-gradient: its angle (0deg points up, clockwise, as in CSS)
// and its colour stops. GradientView turns the angle into start and end
// points for the box it fills.
export type Gradient = {
  angle: number;
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
};

const lightGradients = {
  // Headings and big numbers: dark steel with a shine across the middle.
  metalText: {
    angle: 170,
    colors: ['#1E3A52', '#7FA6C4', '#2E5573'],
    locations: [0, 0.55, 1],
  },
  // The GO button and primary buttons.
  metal: {
    angle: 145,
    colors: ['#A9C6DC', '#7FA6C4', '#4A7192', '#96B8D2'],
    locations: [0, 0.4, 0.62, 1],
  },
  // A progress bar's filled part.
  bar: {
    angle: 90,
    colors: ['#1E3A52', '#7FA6C4', '#A9C6DC'],
    locations: [0, 0.6, 1],
  },
  // The week ring's done segments (SVG x1 0 y1 0 → x2 1 y2 1, which is
  // 135deg on a square).
  ring: {
    angle: 135,
    colors: ['#4A7192', '#A9C6DC', '#7FA6C4'],
    locations: [0, 0.5, 1],
  },
} satisfies Record<string, Gradient>;

export type GradientName = keyof typeof lightGradients;

const darkGradients: Record<GradientName, Gradient> = {
  // Lighter steel, so it reads on charcoal.
  metalText: {
    angle: 170,
    colors: ['#A9C6DC', '#E4EEF5', '#7FA6C4'],
    locations: [0, 0.55, 1],
  },
  metal: lightGradients.metal,
  bar: {
    angle: 90,
    colors: ['#4A7192', '#A9C6DC', '#DCE8F1'],
    locations: [0, 0.6, 1],
  },
  ring: lightGradients.ring,
};

export const gradients: Record<ColorScheme, Record<GradientName, Gradient>> = {
  light: lightGradients,
  dark: darkGradients,
};

// CSS box-shadow strings, copied from the design (React Native's boxShadow
// takes the same syntax, several layers and inset included).
const lightShadows = {
  // Cards.
  card: '0 1px 1px rgba(0, 0, 0, 0.03), 0 12px 32px rgba(0, 0, 0, 0.06)',
  // Small round buttons, raised controls.
  control: '0 1px 1px rgba(0, 0, 0, 0.04), 0 6px 18px rgba(0, 0, 0, 0.07)',
  // The GO button.
  hero: '0 2px 4px rgba(0, 0, 0, 0.04), 0 20px 44px rgba(0, 0, 0, 0.11)',
  // The light catching the top edge of metal. Apart from the shadows above
  // because it goes on a layer over the gradient fill, not under it.
  highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
};

export type ShadowName = keyof typeof lightShadows;

const darkShadows: Record<ShadowName, string> = {
  card: '0 1px 1px rgba(0, 0, 0, 0.3), 0 12px 32px rgba(0, 0, 0, 0.4)',
  control: '0 1px 1px rgba(0, 0, 0, 0.3), 0 6px 18px rgba(0, 0, 0, 0.4)',
  hero: '0 2px 4px rgba(0, 0, 0, 0.3), 0 20px 44px rgba(0, 0, 0, 0.5)',
  highlight: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
};

export const shadows: Record<ColorScheme, Record<ShadowName, string>> = {
  light: lightShadows,
  dark: darkShadows,
};

// Text on metal looks pressed into it (CSS text-shadow 0 1px 2px). The
// metal is the same in both schemes, so these are too.
export const metalTextShadows = {
  // "GO".
  large: {
    textShadowColor: 'rgba(20, 40, 60, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Small capitals under it, button labels.
  small: {
    textShadowColor: 'rgba(20, 40, 60, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
} satisfies Record<string, TextStyle>;
