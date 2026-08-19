import { describe, expect, it } from 'vitest';

import {
  LIMBO_MULTIPLIER_DECIMALS,
  LIMBO_WIN_CHANCE_DECIMALS,
  MAX_CRASH_MULTIPLIER,
} from './limbo-constants';
import {
  createLimboOdds,
  isLimboWon,
  LimboOdds,
  type LimboOddsConfig,
} from './limbo-math';
import { getLimboMultiplierBounds } from './limbo-rtp-bounds';

const TEST_BOUNDS = getLimboMultiplierBounds(0.98);

const TEST_CONFIG: LimboOddsConfig = {
  rtp: 0.98,
  minMultiplier: TEST_BOUNDS.minMultiplier,
  maxMultiplier: TEST_BOUNDS.maxMultiplier,
  multiplierDecimals: LIMBO_MULTIPLIER_DECIMALS,
  winChanceDecimals: LIMBO_WIN_CHANCE_DECIMALS,
  defaultTargetMultiplier: 2,
};

const limbo = new LimboOdds(TEST_CONFIG);

const fairMultiplier = (config: LimboOddsConfig, winChance: number): number => {
  const factor = 10 ** config.multiplierDecimals;
  return Math.round(((config.rtp * 100) / winChance) * factor) / factor;
};

const fairWinChance = (config: LimboOddsConfig, multiplier: number): number => {
  const factor = 10 ** config.winChanceDecimals;
  return Math.round(((config.rtp * 100) / multiplier) * factor) / factor;
};

describe('LimboOdds.calculate', () => {
  it('derives win chance from a target multiplier input', () => {
    expect(limbo.calculate({ targetMultiplier: 1.96 })).toEqual({
      targetMultiplier: 1.96,
      winChance: 50,
    });
  });

  it('derives target multiplier from a win-chance input', () => {
    expect(limbo.calculate({ winChance: 50 })).toEqual({
      targetMultiplier: fairMultiplier(TEST_CONFIG, 50),
      winChance: 50,
    });
  });

  it('rounds target multiplier to two decimals', () => {
    expect(limbo.calculate({ targetMultiplier: 1.969 })).toEqual({
      targetMultiplier: 1.97,
      winChance: 49.74619289,
    });
  });

  it('keeps eight decimals for win chance', () => {
    expect(limbo.calculate({ targetMultiplier: 3 })).toEqual({
      targetMultiplier: 3,
      winChance: 32.66666667,
    });
  });

  it('rounds win-chance input to eight decimals before deriving multiplier', () => {
    expect(limbo.calculate({ winChance: 32.666666666 })).toEqual({
      targetMultiplier: 3,
      winChance: 32.66666667,
    });
  });

  it('prefers win chance when both inputs are provided', () => {
    expect(
      limbo.calculate({
        winChance: 50,
        targetMultiplier: 2,
      }),
    ).toEqual({
      targetMultiplier: fairMultiplier(TEST_CONFIG, 50),
      winChance: 50,
    });
  });

  it('defaults to the configured target multiplier when no input is provided', () => {
    expect(limbo.calculate()).toEqual({
      targetMultiplier: 2,
      winChance: 49,
    });
  });

  it('round-trips target multiplier through win chance', () => {
    const fromTarget = limbo.calculate({ targetMultiplier: 7.25 });
    const fromWinChance = limbo.calculate({
      winChance: fromTarget.winChance,
    });

    expect(fromWinChance.targetMultiplier).toBe(fromTarget.targetMultiplier);
    expect(fromWinChance.winChance).toBe(fromTarget.winChance);
  });

  it('stabilizes after projecting win chance onto a two-decimal multiplier', () => {
    const projected = limbo.calculate({
      targetMultiplier: limbo.calculate({ winChance: 12.3456789 })
        .targetMultiplier,
    });
    const again = limbo.calculate({ winChance: projected.winChance });

    expect(again).toEqual(projected);
  });

  it('throws when win chance is above the allowed range', () => {
    expect(() => limbo.calculate({ winChance: 100 })).toThrow(RangeError);
    expect(() => limbo.calculate({ winChance: 100 })).toThrow(
      'Win chance must be at most',
    );
  });

  it('throws when win chance is below the allowed range', () => {
    const { winChance } = limbo.getLimits();

    expect(() => limbo.calculate({ winChance: winChance.min / 10 })).toThrow(
      RangeError,
    );
  });

  it('throws when target multiplier is below the allowed range', () => {
    expect(() => limbo.calculate({ targetMultiplier: 0.5 })).toThrow(
      RangeError,
    );
    expect(() => limbo.calculate({ targetMultiplier: 0.5 })).toThrow(
      'Target multiplier must be at least',
    );
  });

  it('throws when target multiplier is above the allowed range', () => {
    expect(() =>
      limbo.calculate({ targetMultiplier: MAX_CRASH_MULTIPLIER + 1 }),
    ).toThrow(RangeError);
  });

  it('accepts the exact target-multiplier boundaries from getLimits', () => {
    const { targetMultiplier, winChance } = limbo.getLimits();

    expect(limbo.calculate({ targetMultiplier: targetMultiplier.min })).toEqual(
      {
        targetMultiplier: targetMultiplier.min,
        winChance: winChance.max,
      },
    );

    expect(limbo.calculate({ targetMultiplier: targetMultiplier.max })).toEqual(
      {
        targetMultiplier: targetMultiplier.max,
        winChance: winChance.min,
      },
    );
  });

  it('accepts the exact win-chance boundaries from getLimits', () => {
    const { targetMultiplier, winChance } = limbo.getLimits();

    expect(limbo.calculate({ winChance: winChance.min })).toEqual({
      targetMultiplier: targetMultiplier.max,
      winChance: winChance.min,
    });

    expect(limbo.calculate({ winChance: winChance.max })).toEqual({
      targetMultiplier: targetMultiplier.min,
      winChance: winChance.max,
    });
  });
});

describe('LimboOdds.validate', () => {
  it('returns no errors for values within limits', () => {
    expect(limbo.validate({ targetMultiplier: 2, winChance: 49 })).toEqual({});
  });

  it('accepts exact boundary values without errors', () => {
    const { targetMultiplier, winChance } = limbo.getLimits();

    expect(
      limbo.validate({
        targetMultiplier: targetMultiplier.min,
        winChance: winChance.max,
      }),
    ).toEqual({});

    expect(
      limbo.validate({
        targetMultiplier: targetMultiplier.max,
        winChance: winChance.min,
      }),
    ).toEqual({});
  });

  it('returns errors for out-of-range values', () => {
    const errors = limbo.validate({
      targetMultiplier: 0.5,
      winChance: 100,
    });

    expect(errors.targetMultiplier).toContain('at least');
    expect(errors.winChance).toContain('at most');
  });

  it('reports an error when target multiplier is above the maximum', () => {
    const errors = limbo.validate({
      targetMultiplier: MAX_CRASH_MULTIPLIER + 1,
      winChance: 49,
    });

    expect(errors.targetMultiplier).toContain('at most');
  });

  it('reports an error when win chance is below the minimum', () => {
    const { winChance } = limbo.getLimits();
    const errors = limbo.validate({
      targetMultiplier: 2,
      winChance: winChance.min / 10,
    });

    expect(errors.winChance).toContain('at least');
  });
});

describe('LimboOdds.getLimits', () => {
  it('exposes multiplier and win-chance bounds', () => {
    const limits = limbo.getLimits();

    expect(limits.targetMultiplier).toEqual({
      min: 1.01,
      max: MAX_CRASH_MULTIPLIER,
    });
    expect(limits.winChance).toEqual({
      min: 0.000098,
      max: 97.02970297,
    });
  });
});

describe('createLimboOdds', () => {
  it('builds odds from rtp-derived bounds', () => {
    const odds = createLimboOdds(0.98);
    const result = odds.calculate({ winChance: 50 });

    expect(result.targetMultiplier).toBe(1.96);
    expect(result.winChance).toBe(50);
  });

  it('scales the multiplier with the configured rtp', () => {
    expect(createLimboOdds(0.98).calculate({ winChance: 50 })).toEqual({
      targetMultiplier: 1.96,
      winChance: 50,
    });
    expect(createLimboOdds(0.99).calculate({ winChance: 50 })).toEqual({
      targetMultiplier: 1.98,
      winChance: 50,
    });
  });

  it('shifts win-chance limits with rtp', () => {
    const at98 = createLimboOdds(0.98).getLimits();
    const at99 = createLimboOdds(0.99).getLimits();

    expect(at99.winChance.max).toBeGreaterThan(at98.winChance.max);
    expect(at99.winChance.min).toBeGreaterThan(at98.winChance.min);
  });
});

describe('isLimboWon', () => {
  it('wins when rolled multiplier equals target', () => {
    expect(isLimboWon({ rolledMultiplier: 2, targetMultiplier: 2 })).toBe(true);
  });

  it('wins when rolled multiplier exceeds target', () => {
    expect(isLimboWon({ rolledMultiplier: 2.5, targetMultiplier: 2 })).toBe(
      true,
    );
  });

  it('loses when rolled multiplier is below target', () => {
    expect(isLimboWon({ rolledMultiplier: 1.99, targetMultiplier: 2 })).toBe(
      false,
    );
  });

  it('rounds values to limbo precision before comparing', () => {
    expect(
      isLimboWon({ rolledMultiplier: 1.999, targetMultiplier: 2.001 }),
    ).toBe(true);
  });
});

describe('LimboOdds rtp expected return', () => {
  it('targets rtp as expected return per unit bet at 50% win chance', () => {
    const bet = 2;
    const rtp = 0.98;
    const odds = createLimboOdds(rtp);
    const { targetMultiplier, winChance } = odds.calculate({
      winChance: 50,
    });

    const expectedReturn = (winChance / 100) * bet * targetMultiplier;

    expect(targetMultiplier).toBe(1.96);
    expect(expectedReturn).toBeCloseTo(bet * rtp, 10);
  });

  it('pins target multiplier formula at non-50% win chances', () => {
    const odds = createLimboOdds(0.98);

    expect(odds.calculate({ winChance: 25 })).toEqual({
      targetMultiplier: 3.92,
      winChance: 25,
    });
    expect(odds.calculate({ winChance: 10 })).toEqual({
      targetMultiplier: 9.8,
      winChance: 10,
    });
  });

  it('targets rtp as expected return at non-50% win chance', () => {
    const bet = 5;
    const rtp = 0.98;
    const odds = createLimboOdds(rtp);
    const { targetMultiplier, winChance } = odds.calculate({
      winChance: 25,
    });

    expect((winChance / 100) * bet * targetMultiplier).toBeCloseTo(
      bet * rtp,
      10,
    );
  });

  it('matches fairWinChance helper at awkward multipliers', () => {
    const odds = createLimboOdds(0.98);
    const { winChance } = odds.calculate({ targetMultiplier: 12.34 });

    expect(winChance).toBe(fairWinChance(TEST_CONFIG, 12.34));
  });
});

describe('LimboOdds with a custom config', () => {
  it('honors a custom default target multiplier', () => {
    const custom = new LimboOdds({ defaultTargetMultiplier: 5 });

    expect(custom.calculate()).toEqual({
      targetMultiplier: 5,
      winChance: fairWinChance(
        { ...TEST_CONFIG, defaultTargetMultiplier: 5 },
        5,
      ),
    });
  });

  it('honors custom multiplier bounds', () => {
    const custom = new LimboOdds({
      minMultiplier: 2,
      maxMultiplier: 100,
    });
    const limits = custom.getLimits();

    expect(limits.targetMultiplier).toEqual({ min: 2, max: 100 });
    expect(limits.winChance.max).toBe(fairWinChance(TEST_CONFIG, 2));
    expect(limits.winChance.min).toBe(fairWinChance(TEST_CONFIG, 100));
    expect(() => custom.calculate({ targetMultiplier: 1.5 })).toThrow(
      RangeError,
    );
    expect(() => custom.calculate({ targetMultiplier: 101 })).toThrow(
      RangeError,
    );
  });

  it('honors custom decimals', () => {
    const custom = new LimboOdds({
      multiplierDecimals: 1,
      winChanceDecimals: 2,
    });

    expect(custom.calculate({ targetMultiplier: 1.96 })).toEqual({
      targetMultiplier: 2,
      winChance: 49,
    });
    expect(custom.calculate({ winChance: 32.66666667 })).toEqual({
      targetMultiplier: 3,
      winChance: 32.67,
    });
  });
});
