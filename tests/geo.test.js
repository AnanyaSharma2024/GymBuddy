const { isValidCoordinates, distanceKm, toApproximateDistance } = require('../src/utils/geo');

describe('geo utils', () => {
  test('rejects out-of-range coordinates', () => {
    expect(isValidCoordinates([200, 45])).toBe(false);
    expect(isValidCoordinates([70, -95])).toBe(false);
    expect(isValidCoordinates([0, 0])).toBe(false); // null island guard
  });

  test('accepts valid coordinates', () => {
    expect(isValidCoordinates([77.5, 28.6])).toBe(true);
  });

  test('computes a sensible distance between two known points', () => {
    // Roughly Delhi <-> Meerut, ~65km apart
    const km = distanceKm([77.2090, 28.6139], [77.7064, 28.9845]);
    expect(km).toBeGreaterThan(50);
    expect(km).toBeLessThan(80);
  });

  test('approximate distance never leaks sub-500m precision', () => {
    expect(toApproximateDistance(0.2)).toBe('< 0.5 km');
  });
});
