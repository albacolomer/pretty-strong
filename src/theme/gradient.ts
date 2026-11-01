export type GradientPoint = { x: number; y: number };

// Top to bottom: what a box with no size yet gets.
const DEFAULT = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };

// CSS's linear-gradient(<angle>) as start and end points for
// expo-linear-gradient, as fractions of a box of this size. CSS runs the
// gradient along a line through the box's centre at that angle (0deg
// points up, clockwise), just long enough for the far corners to get the
// first and last colours. So the points depend on the box's shape, and on
// a wide box they fall outside 0–1 (expo-linear-gradient draws them there).
export function cssGradientPoints(
  angle: number,
  width: number,
  height: number,
): { start: GradientPoint; end: GradientPoint } {
  if (width <= 0 || height <= 0) return DEFAULT;
  const radians = (angle * Math.PI) / 180;
  // The direction, with y pointing down as on screen.
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const half = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  return {
    start: { x: 0.5 - (dx * half) / width, y: 0.5 - (dy * half) / height },
    end: { x: 0.5 + (dx * half) / width, y: 0.5 + (dy * half) / height },
  };
}
