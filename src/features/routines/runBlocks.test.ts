import { NO_TARGETS } from './routine';
import { isRunBlockComplete, runBlockKind, runBlockSummary } from './runBlocks';

const block = (plannedSets: number, distanceM: number | null, durationS: number | null) => ({
  plannedSets,
  targets: { ...NO_TARGETS, distanceM, durationS },
});

describe('runBlockKind', () => {
  test('follows from the numbers', () => {
    expect(runBlockKind(block(6, 400, null))).toBe('intervals');
    expect(runBlockKind(block(1, null, 2700))).toBe('time');
    expect(runBlockKind(block(1, 10000, null))).toBe('distance');
    expect(runBlockKind(block(1, null, null))).toBe('distance');
  });
});

describe('isRunBlockComplete', () => {
  test('needs the block’s main number; intervals need a distance or a time', () => {
    expect(isRunBlockComplete('distance', block(1, null, null).targets)).toBe(false);
    expect(isRunBlockComplete('distance', block(1, 5000, null).targets)).toBe(true);
    expect(isRunBlockComplete('time', block(1, null, 600).targets)).toBe(true);
    expect(isRunBlockComplete('intervals', block(6, null, null).targets)).toBe(false);
    expect(isRunBlockComplete('intervals', block(6, null, 60).targets)).toBe(true);
  });
});

describe('runBlockSummary', () => {
  test('describes each kind briefly, with the language’s decimals', () => {
    expect(runBlockSummary('distance', block(1, 5500, null), 'ca')).toBe('5,5 km');
    expect(runBlockSummary('distance', block(1, 5500, null), 'en')).toBe('5.5 km');
    expect(runBlockSummary('time', block(1, null, 2700), 'ca')).toBe('45 min');
    expect(runBlockSummary('intervals', block(6, 400, null), 'ca')).toBe('6 × 400 m');
    expect(runBlockSummary('intervals', block(8, 400, 90), 'ca')).toBe('8 × 400 m · 1:30');
    expect(runBlockSummary('distance', block(1, null, null), 'ca')).toBe('');
  });
});
