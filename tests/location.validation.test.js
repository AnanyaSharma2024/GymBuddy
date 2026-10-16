const { isValidCoordinates } = require('../src/utils/geo');

describe('coordinate validation guards against absurd input', () => {
  test.each([
    [[-200, 0]],
    [[200, 0]],
    [[0, -100]],
    [[0, 100]],
    [[0, 0]],
  ])('rejects %p', (coords) => {
    expect(isValidCoordinates(coords)).toBe(false);
  });

  test('accepts realistic coordinates', () => {
    expect(isValidCoordinates([77.5946, 12.9716])).toBe(true);
  });
});
