import {
  fromCm,
  fromKg,
  fromKmh,
  fromMetres,
  METRIC_UNITS,
  readUnits,
  toCm,
  toKg,
  toKmh,
  toMetres,
} from './units';

describe('units', () => {
  test('metric is left as it is', () => {
    expect(fromKg(60, 'kg')).toBe(60);
    expect(toKg(60, 'kg')).toBe(60);
    expect(fromCm(75, 'cm')).toBe(75);
    expect(fromKmh(10, 'km')).toBe(10);
    expect(fromMetres(5000, 'km')).toBe(5);
  });

  test('pounds, and back to the kg the database keeps', () => {
    expect(fromKg(45.36, 'lb')).toBeCloseTo(100, 1);
    expect(toKg(100, 'lb')).toBeCloseTo(45.359, 3);
    // Saved with two decimals, it still shows the pounds that were typed.
    expect(fromKg(Number(toKg(135, 'lb').toFixed(2)), 'lb')).toBeCloseTo(135, 1);
  });

  test('inches', () => {
    expect(toCm(30, 'in')).toBeCloseTo(76.2, 5);
    expect(fromCm(76.2, 'in')).toBeCloseTo(30, 5);
  });

  test('miles and miles per hour', () => {
    expect(fromMetres(1609.344, 'mi')).toBeCloseTo(1, 5);
    expect(toMetres(3.1, 'mi')).toBeCloseTo(4988.97, 2);
    expect(fromKmh(16.09344, 'mi')).toBeCloseTo(10, 5);
    expect(toKmh(6, 'mi')).toBeCloseTo(9.656, 3);
  });

  test('a profile’s saved units, with anything unexpected as metric', () => {
    expect(readUnits({ weight: 'lb', length: 'in', distance: 'mi' })).toEqual({
      weight: 'lb',
      length: 'in',
      distance: 'mi',
    });
    expect(readUnits({ weight: 'stone', length: '', distance: 'km' })).toEqual(METRIC_UNITS);
  });
});
