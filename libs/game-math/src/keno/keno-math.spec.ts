import { describe, expect, it } from 'vitest';

import { createKenoOdds } from './keno-math';
import { getBaseKenoMultipliers } from './keno-multipliers';
import {
  calculateKenoExpectedReturn,
  getKenoHitProbability,
} from './keno-probability';
import {
  KENO_RISKS,
  MAX_KENO_PICKS,
  MIN_KENO_PICKS,
  type KenoRisk,
} from './keno-constants';
import { KENO_REFERENCE_PAYTABLES } from './keno-reference-paytables';

const EXPECTED_RETURN: Record<number, Record<KenoRisk, number>> = {
  1: {
    classic: 0.99,
    low: 0.9874999999999999,
    medium: 0.9875,
    high: 0.99,
  },
  2: {
    classic: 0.9903846153846154,
    low: 0.9884615384615385,
    medium: 0.9865384615384616,
    high: 0.9865384615384617,
  },
  3: {
    classic: 0.9901821862348179,
    low: 0.9886639676113361,
    medium: 0.9898785425101214,
    high: 0.9898785425101214,
  },
  4: {
    classic: 0.9896049896049895,
    low: 0.9892220155378051,
    medium: 0.9878268957216325,
    high: 0.9890578837947259,
  },
  5: {
    classic: 0.9898580260422365,
    low: 0.9890305285042127,
    medium: 0.9894408578619105,
    high: 0.9888937520516468,
  },
  6: {
    classic: 0.9896651712441188,
    low: 0.9900837071889703,
    medium: 0.988346646241383,
    high: 0.9899879636721741,
  },
  7: {
    classic: 0.9898153517890359,
    low: 0.9893875955021466,
    medium: 0.9896178626828782,
    high: 0.989617862682878,
  },
  8: {
    classic: 0.9902282806307575,
    low: 0.9900417965433446,
    medium: 0.9892363514654537,
    high: 0.9895710514905562,
  },
  9: {
    classic: 0.9897533957131479,
    low: 0.9906886394502493,
    medium: 0.9894201951090495,
    high: 0.9896445596909994,
  },
  10: {
    classic: 0.990373520730931,
    low: 0.9875973711730976,
    medium: 0.9897431463270873,
    high: 0.9900832270439281,
  },
};

const PARTIAL_MULTIPLIER_CELLS = [
  { pickCount: 1, risk: 'low' as const, hitCount: 0, multiplier: 0.7 },
  { pickCount: 1, risk: 'medium' as const, hitCount: 0, multiplier: 0.4 },
  { pickCount: 4, risk: 'classic' as const, hitCount: 1, multiplier: 0.8 },
  { pickCount: 5, risk: 'classic' as const, hitCount: 1, multiplier: 0.25 },
  { pickCount: 7, risk: 'classic' as const, hitCount: 2, multiplier: 0.47 },
];

describe('keno probability', () => {
  it('sums hit probabilities to 1 for every supported pick count', () => {
    for (
      let pickCount = MIN_KENO_PICKS;
      pickCount <= MAX_KENO_PICKS;
      pickCount += 1
    ) {
      let total = 0;

      for (let hit = 0; hit <= pickCount; hit += 1) {
        total += getKenoHitProbability(pickCount, hit);
      }

      expect(total).toBeCloseTo(1, 10);
    }
  });

  it('returns 0.25 for a single pick hit', () => {
    expect(getKenoHitProbability(1, 1)).toBeCloseTo(0.25, 10);
  });

  it('returns 0 for impossible hit counts', () => {
    expect(getKenoHitProbability(1, 2)).toBe(0);
    expect(getKenoHitProbability(3, 4)).toBe(0);
  });
});

describe('keno reference paytables', () => {
  it('defines every pick count and risk combination', () => {
    for (
      let pickCount = MIN_KENO_PICKS;
      pickCount <= MAX_KENO_PICKS;
      pickCount += 1
    ) {
      for (const risk of KENO_RISKS) {
        const table = KENO_REFERENCE_PAYTABLES[pickCount]?.[risk];
        expect(table).toBeDefined();
        expect(table).toHaveLength(pickCount + 1);
      }
    }
  });

  it('pins expected return for every pick and risk combination', () => {
    for (
      let pickCount = MIN_KENO_PICKS;
      pickCount <= MAX_KENO_PICKS;
      pickCount += 1
    ) {
      for (const risk of KENO_RISKS) {
        const table = getBaseKenoMultipliers(pickCount, risk);
        const expectedReturn = calculateKenoExpectedReturn(pickCount, table);

        expect(expectedReturn).toBeCloseTo(
          EXPECTED_RETURN[pickCount][risk],
          10,
        );
        expect(table.some((multiplier) => multiplier > 0)).toBe(true);
      }
    }
  });

  it('pins 10-pick medium top multiplier', () => {
    const table = getBaseKenoMultipliers(10, 'medium');
    expect(table[10]).toBe(1000);
    expect(table[3]).toBe(1.6);
  });

  it('pins 10-pick high top multiplier with monotonic paying tiers', () => {
    const table = getBaseKenoMultipliers(10, 'high');
    expect(table[10]).toBe(1000);
    expect(table[9]).toBe(800);
    expect(table[9]).toBeLessThanOrEqual(table[10]);
    expect(table[4]).toBe(3.5);
  });

  it('pins 7-pick classic and 8-pick high jackpots', () => {
    expect(getBaseKenoMultipliers(7, 'classic')[7]).toBe(60);
    expect(getBaseKenoMultipliers(8, 'high')[8]).toBe(900);
  });

  it('keeps paying tiers non-decreasing among positive multipliers', () => {
    for (
      let pickCount = MIN_KENO_PICKS;
      pickCount <= MAX_KENO_PICKS;
      pickCount += 1
    ) {
      for (const risk of KENO_RISKS) {
        const table = getBaseKenoMultipliers(pickCount, risk);
        let lastPositive = -1;

        for (let hit = 0; hit <= pickCount; hit += 1) {
          if (table[hit] > 0) {
            if (lastPositive >= 0) {
              expect(table[hit]).toBeGreaterThanOrEqual(lastPositive);
            }
            lastPositive = table[hit];
          }
        }
      }
    }
  });

  it('exposes partial-return multipliers between 0 and 1', () => {
    for (const cell of PARTIAL_MULTIPLIER_CELLS) {
      const multiplier = getBaseKenoMultipliers(cell.pickCount, cell.risk)[
        cell.hitCount
      ];
      expect(multiplier).toBe(cell.multiplier);
      expect(multiplier).toBeGreaterThan(0);
      expect(multiplier).toBeLessThan(1);
    }
  });

  it('rejects unsupported pick counts', () => {
    expect(() => getBaseKenoMultipliers(0, 'classic')).toThrow(RangeError);
    expect(() => getBaseKenoMultipliers(11, 'classic')).toThrow(RangeError);
  });
});

describe('createKenoOdds', () => {
  it('returns fixed reference paytables', () => {
    const odds = createKenoOdds();
    const medium = odds.getPaytable(10, 'medium');
    const reference = getBaseKenoMultipliers(10, 'medium');
    expect(medium).toEqual([...reference]);
  });

  it('returns partial multipliers from fixed paytables', () => {
    const odds = createKenoOdds();

    for (const cell of PARTIAL_MULTIPLIER_CELLS) {
      expect(odds.getMultiplier(cell.pickCount, cell.risk, cell.hitCount)).toBe(
        cell.multiplier,
      );
    }
  });

  it('validates pick count bounds', () => {
    const odds = createKenoOdds();
    expect(odds.validate({ picks: [], risk: 'medium' }).picks).toBeDefined();
    expect(
      odds.validate({
        picks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        risk: 'medium',
      }).picks,
    ).toBeDefined();
  });

  it('rejects duplicate and out-of-range picks', () => {
    const odds = createKenoOdds();

    expect(
      odds.validate({ picks: [1, 1], risk: 'medium' }).picks,
    ).toBeDefined();
    expect(odds.validate({ picks: [0], risk: 'medium' }).picks).toBeDefined();
    expect(odds.validate({ picks: [41], risk: 'medium' }).picks).toBeDefined();
  });

  it('rejects invalid risk', () => {
    const odds = createKenoOdds();
    expect(odds.validate({ picks: [1], risk: 'extreme' }).risk).toBeDefined();
  });

  it('normalizes picks to sorted unique values', () => {
    const odds = createKenoOdds();
    expect(odds.normalizePicks([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it('throws when normalizing duplicate picks', () => {
    const odds = createKenoOdds();
    expect(() => odds.normalizePicks([1, 1])).toThrow(RangeError);
  });

  it('counts hits between picks and drawn numbers', () => {
    const odds = createKenoOdds();
    expect(odds.countHits([1, 2, 3], [1, 4, 2, 5])).toBe(2);
  });

  it('throws for invalid hit counts when reading multipliers', () => {
    const odds = createKenoOdds();
    expect(() => odds.getMultiplier(3, 'medium', 4)).toThrow(RangeError);
    expect(() => odds.getMultiplier(3, 'medium', -1)).toThrow(RangeError);
  });

  it('exposes pick and risk limits', () => {
    const odds = createKenoOdds();
    expect(odds.getLimits()).toEqual({
      picks: { min: MIN_KENO_PICKS, max: MAX_KENO_PICKS },
      risk: KENO_RISKS,
    });
  });
});
