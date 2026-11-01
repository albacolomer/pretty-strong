import { cssGradientPoints } from './gradient';

function rounded(points: ReturnType<typeof cssGradientPoints>) {
  const round = (value: number) => Math.round(value * 1000) / 1000 + 0;
  return {
    start: { x: round(points.start.x), y: round(points.start.y) },
    end: { x: round(points.end.x), y: round(points.end.y) },
  };
}

describe('cssGradientPoints', () => {
  it('runs 180deg from top to bottom', () => {
    expect(rounded(cssGradientPoints(180, 200, 50))).toEqual({
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
    });
  });

  it('runs 90deg from left to right', () => {
    expect(rounded(cssGradientPoints(90, 200, 3))).toEqual({
      start: { x: 0, y: 0.5 },
      end: { x: 1, y: 0.5 },
    });
  });

  it('runs 135deg corner to corner on a square, like SVG 0,0 → 1,1', () => {
    expect(rounded(cssGradientPoints(135, 228, 228))).toEqual({
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    });
  });

  it('goes past the box on a wide one, as CSS does', () => {
    // "AVUI" in the title: 170deg on a box about 110 × 46.
    const { start, end } = cssGradientPoints(170, 110, 46);
    expect(start.y).toBeLessThan(0);
    expect(end.y).toBeGreaterThan(1);
    // Mostly downwards, a little to the right.
    expect(start.x).toBeCloseTo(0.449, 3);
    expect(end.x).toBeCloseTo(0.551, 3);
  });

  it('is symmetric about the centre', () => {
    const { start, end } = cssGradientPoints(145, 182, 182);
    expect(start.x + end.x).toBeCloseTo(1);
    expect(start.y + end.y).toBeCloseTo(1);
  });

  it('falls back to top to bottom before the box has a size', () => {
    expect(cssGradientPoints(170, 0, 0)).toEqual({
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
    });
  });
});
