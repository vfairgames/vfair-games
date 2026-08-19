import { describe, expect, it } from 'vitest';

import { getDiceMultiplierBounds } from './dice-rtp-bounds';

describe('getDiceMultiplierBounds', () => {
  it('derives max multiplier from minimum win chance at default rtp', () => {
    expect(getDiceMultiplierBounds(0.98)).toEqual({
      minMultiplier: 1.01,
      maxMultiplier: 9800,
    });
  });

  it('scales max multiplier with rtp', () => {
    expect(getDiceMultiplierBounds(0.99).maxMultiplier).toBe(9900);
  });

  it('does not allow min multiplier below 1.01', () => {
    expect(getDiceMultiplierBounds(0.99).minMultiplier).toBe(1.01);
    expect(getDiceMultiplierBounds(0.9).minMultiplier).toBe(1.01);
  });
});
