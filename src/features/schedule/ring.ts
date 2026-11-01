// The week ring on Avui, drawn in a 240 × 240 SVG box (as in the design):
// a circle split into one segment per workout of the week's goal, with a
// small gap between them, and the done ones drawn over it. Each is one
// circle with a strokeDasharray (dash, gap, dash, gap…), not one arc per
// segment.
export const RING_BOX = 240;
export const RING_RADIUS = 114;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const GAP = 8;

export type RingDashes = {
  // Every segment, for the track.
  track: number[];
  // The done ones, from the top clockwise; null with none done.
  done: number[] | null;
  // Turns the circle (degrees) so the first gap is centred at the top:
  // SVG circles start at 3 o'clock.
  rotation: number;
};

export function ringDashes(segments: number, done: number): RingDashes {
  const count = Math.max(1, Math.round(segments));
  const filled = Math.min(Math.max(0, Math.round(done)), count);
  const each = CIRCUMFERENCE / count;
  const dash = each - GAP;
  const track = [dash, GAP];
  let doneDashes: number[] | null = null;
  if (filled === count) {
    doneDashes = track;
  } else if (filled > 0) {
    doneDashes = Array.from({ length: filled }, () => [dash, GAP]).flat();
    // The last gap runs on to the end of the circle, so the pattern doesn't
    // repeat into the segments still to do.
    doneDashes[doneDashes.length - 1] = CIRCUMFERENCE - filled * each + GAP;
  }
  return {
    track,
    done: doneDashes,
    rotation: -90 + (GAP / 2 / CIRCUMFERENCE) * 360,
  };
}
