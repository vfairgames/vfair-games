import { describe, expect, it } from 'vitest';

import { multiplyDecimals, roundToDecimals } from './decimal';

describe('multiplyDecimals', () => {
  it('avoids binary float drift for common fractional bets', () => {
    expect(
      multiplyDecimals(
        { value: 0.1, decimals: 2 },
        { value: 3, decimals: 0 },
        2,
      ),
    ).toBe(0.3);
    expect(
      multiplyDecimals(
        { value: 0.1, decimals: 2 },
        { value: 0.2, decimals: 2 },
        2,
      ),
    ).toBe(0.02);
  });
});

describe('roundToDecimals', () => {
  it('normalizes float noise before rounding', () => {
    expect(roundToDecimals(0.1 + 0.2, 2)).toBe(0.3);
  });

  it('rounds half away from zero at common currency decimals', () => {
    expect(roundToDecimals(1.005, 2)).toBe(1.01);
    expect(roundToDecimals(1.23456, 4)).toBe(1.2346);
  });

  it('handles scientific-notation magnitudes without NaN', () => {
    expect(roundToDecimals(1e-7, 8)).toBe(1e-7);
    expect(roundToDecimals(1e-8, 8)).toBe(1e-8);
    expect(roundToDecimals(1.23e-7, 8)).toBe(0.00000012);
  });
});
