import { describe, expect, it } from 'vitest';

import { MAX_CRASH_MULTIPLIER } from './limbo-constants';
import { getLimboMultiplierBounds } from './limbo-rtp-bounds';

describe('getLimboMultiplierBounds', () => {
  it('caps max multiplier at the crash ceiling when win chance is fine-grained', () => {
    expect(getLimboMultiplierBounds(0.98)).toEqual({
      minMultiplier: 1.01,
      maxMultiplier: MAX_CRASH_MULTIPLIER,
    });
  });

  it('keeps max multiplier capped across rtp values', () => {
    expect(getLimboMultiplierBounds(0.99).maxMultiplier).toBe(
      MAX_CRASH_MULTIPLIER,
    );
    expect(getLimboMultiplierBounds(0.9).maxMultiplier).toBe(
      MAX_CRASH_MULTIPLIER,
    );
  });

  it('does not allow min multiplier below 1.01', () => {
    expect(getLimboMultiplierBounds(0.99).minMultiplier).toBe(1.01);
    expect(getLimboMultiplierBounds(0.9).minMultiplier).toBe(1.01);
  });
});
