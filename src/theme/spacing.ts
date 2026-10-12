// 4-pt grid.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  input: 12,
  card: 16,
  pill: 999,
} as const;

// Minimum touch target sizes (gym UX rule 1).
export const touch = {
  min: 48,
  check: 56,
} as const;
