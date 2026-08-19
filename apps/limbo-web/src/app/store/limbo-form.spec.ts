import { describe, expect, it } from 'vitest';

import { createLimboOdds } from '@vfair/game-math';

import { applyFormPatch, initialLimboForm } from './limbo-form';

const limits = {
  minBet: 0.1,
  maxBet: 100,
  maxWin: 10000,
  currencyDecimals: 2,
};

describe('limbo-form', () => {
  it('keeps target multiplier and win chance in sync', () => {
    const limboOdds = createLimboOdds(0.98);
    const current = { ...initialLimboForm(limboOdds), betAmount: 1 };

    const result = applyFormPatch(
      current,
      { winChance: 50 },
      limits,
      limboOdds,
    );

    expect(result.form.targetMultiplier).toBe(1.96);
    expect(result.form.winChance).toBe(50);
    expect(result.canPlaceManualBet).toBe(true);
  });
});
