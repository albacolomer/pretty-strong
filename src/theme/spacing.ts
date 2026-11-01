// 4-pt grid.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// The design's own insets, off the grid.
export const inset = {
  // A screen's sides and bottom, and how far its content starts from the
  // top of the phone (status bar included).
  screenX: 20,
  screenTop: 58,
  screenBottom: 30,
  // Inside a card.
  cardX: 16,
  cardY: 14,
} as const;

export const radius = {
  input: 12,
  card: 18,
  pill: 999,
} as const;

// Minimum touch target sizes (gym UX rule 1).
export const touch = {
  min: 48,
  check: 56,
} as const;
