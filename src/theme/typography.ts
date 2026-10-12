import type { TextStyle } from 'react-native';

// No fontFamily: the iOS system font is SF Pro.
// Tabular digits give every number the same width, so a weight or the
// timer doesn't shift sideways as its value changes.
export const typography = {
  timer: { fontSize: 48, lineHeight: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  cardTitle: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  // Buttons and emphasised body text.
  bodyStrong: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  input: { fontSize: 22, lineHeight: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
