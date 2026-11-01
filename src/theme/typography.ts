import type { TextStyle } from 'react-native';

// The design's two typefaces, one name per face (src/lib/fonts.ts loads
// them under these names). iOS takes a custom font's weight from the file,
// not from fontWeight, so each style names the exact face it uses.
export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semiBold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
  // Barlow Condensed: names and times in lists, and the big italic words.
  condensed: 'BarlowCondensed_600SemiBold',
  condensedItalic: 'BarlowCondensed_700Bold_Italic',
} as const;

// CSS sizes letter-spacing in em (a share of the font size); React Native
// in points.
function em(value: number, fontSize: number): number {
  return value * fontSize;
}

// Tabular digits give every number the same width, so a weight or the
// timer doesn't shift sideways as its value changes. Capitals come from
// textTransform, so the translations stay in normal case (and VoiceOver
// reads them as words, not letters).
export const typography = {
  // Every screen's title, e.g. "AVUI": big condensed italic capitals.
  screenTitle: {
    fontFamily: fonts.condensedItalic,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: em(0.01, 44),
    textTransform: 'uppercase',
  },
  // "GO" on the big button.
  hero: { fontFamily: fonts.condensedItalic, fontSize: 64, lineHeight: 64 },
  timer: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 56, fontVariant: ['tabular-nums'] },
  // Big numbers and letters: the avatar's initial, your weight.
  display: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 52 },
  // Headings, e.g. the routine's name on Avui.
  title: { fontFamily: fonts.semiBold, fontSize: 26, lineHeight: 35, letterSpacing: em(-0.02, 26) },
  // The number a card leads with, e.g. today's steps.
  stat: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 35, fontVariant: ['tabular-nums'] },
  // What that number is out of: "/ 10.000".
  statUnit: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 20, lineHeight: 25 },
  body: { fontFamily: fonts.regular, fontSize: 17, lineHeight: 23 },
  // Buttons and emphasised body text.
  bodyStrong: { fontFamily: fonts.semiBold, fontSize: 17, lineHeight: 23 },
  input: { fontFamily: fonts.semiBold, fontSize: 22, lineHeight: 28, fontVariant: ['tabular-nums'] },
  // Compact controls, e.g. the options of a segmented control.
  control: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  // A caption that stands out a little, e.g. "3.760 per arribar".
  captionMedium: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  // Small spaced capitals: a card's label ("PASSOS"), a button's caption.
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: em(0.14, 13),
    textTransform: 'uppercase',
  },
  // The line over a screen's title, e.g. the date on Avui.
  eyebrow: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: em(0.14, 13),
    textTransform: 'uppercase',
  },
  // An activity's name in a list, in condensed capitals.
  name: {
    fontFamily: fonts.condensed,
    fontSize: 20,
    lineHeight: 23,
    letterSpacing: em(0.02, 20),
    textTransform: 'uppercase',
  },
  // A time of day in a list, e.g. "20:30".
  time: { fontFamily: fonts.condensed, fontSize: 26, lineHeight: 35 },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
