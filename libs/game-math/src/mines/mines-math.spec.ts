import { describe, expect, it } from 'vitest';

import { DEFAULT_GAME_RTP } from '../game-rtp';
import {
  DEFAULT_MINE_COUNT,
  MAX_MINE_COUNT,
  MIN_MINE_COUNT,
  MINES_MULTIPLIER_DECIMALS,
} from './mines-constants';
import {
  createMinesOdds,
  getGemCount,
  isMineHit,
  MinesOdds,
} from './mines-math';

describe('getGemCount', () => {
  it('returns remaining tiles after mines', () => {
    expect(getGemCount(12)).toBe(13);
    expect(getGemCount(1)).toBe(24);
    expect(getGemCount(24)).toBe(1);
  });
});

describe('isMineHit', () => {
  it('detects mine tiles', () => {
    expect(isMineHit(3, [1, 3, 7])).toBe(true);
    expect(isMineHit(2, [1, 3, 7])).toBe(false);
  });
});

describe('MinesOdds', () => {
  const odds = createMinesOdds(DEFAULT_GAME_RTP);

  it('uses default mine count', () => {
    expect(odds.getDefaultMineCount()).toBe(DEFAULT_MINE_COUNT);
  });

  it('returns gem count for valid mine counts', () => {
    expect(odds.getGemCount(12)).toBe(13);
  });

  it('rejects invalid mine counts', () => {
    expect(() => odds.getGemCount(0)).toThrow(RangeError);
    expect(() => odds.getGemCount(25)).toThrow(RangeError);
    expect(() => odds.getGemCount(1.5)).toThrow(RangeError);
  });

  it('returns multiplier 1 at zero reveals', () => {
    expect(odds.getMultiplier(3, 0)).toBe(1);
  });

  it('increases multiplier as more gems are revealed', () => {
    const first = odds.getMultiplier(3, 1);
    const second = odds.getMultiplier(3, 2);
    const third = odds.getMultiplier(3, 3);

    expect(first).toBeGreaterThan(1);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it('applies RTP once on the exact fair product fraction', () => {
    expect(odds.getMultiplier(3, 2)).toBe(1.27);
  });

  it('rounds multipliers to two decimals without float product drift', () => {
    expect(MINES_MULTIPLIER_DECIMALS).toBe(2);
    expect(odds.getMultiplier(3, 2)).toBe(1.27);
    expect(odds.getMultiplier(1, 3)).toBe(1.11);
    expect(odds.getMultiplier(1, 15)).toBe(2.45);

    const highRtp = createMinesOdds(0.99);
    expect(highRtp.getMultiplier(1, 3)).toBe(1.13);
    expect(highRtp.getMultiplier(1, 15)).toBe(2.48);
  });

  it('supports edge mine counts', () => {
    expect(odds.getMultiplier(MIN_MINE_COUNT, 1)).toBeGreaterThan(1);
    expect(odds.getMultiplier(MAX_MINE_COUNT, 1)).toBeGreaterThan(
      odds.getMultiplier(MIN_MINE_COUNT, 1),
    );
  });

  it('supports max reveal count for a mine count', () => {
    const mineCount = 3;
    const maxReveals = odds.getGemCount(mineCount);
    const maxMultiplier = odds.getMultiplier(mineCount, maxReveals);

    expect(maxReveals).toBe(22);
    expect(maxMultiplier).toBeGreaterThan(
      odds.getMultiplier(mineCount, maxReveals - 1),
    );
  });

  it('rejects invalid reveal counts when computing multipliers', () => {
    expect(() => odds.getMultiplier(3, -1)).toThrow(RangeError);
    expect(() => odds.getMultiplier(3, 23)).toThrow(RangeError);
    expect(() => odds.getMultiplier(3, 1.5)).toThrow(RangeError);
  });

  it('validates mine and reveal counts', () => {
    expect(odds.validate({ mineCount: 3 })).toEqual({});
    expect(odds.validate({ mineCount: 0 }).mineCount).toBeDefined();
    expect(
      odds.validate({ mineCount: 3, revealCount: 23 }).revealCount,
    ).toBeDefined();
    expect(
      odds.validate({ mineCount: 3, revealCount: -1 }).revealCount,
    ).toBeDefined();
  });

  it('exposes limits', () => {
    expect(odds.getLimits(3)).toEqual({
      mineCount: { min: MIN_MINE_COUNT, max: MAX_MINE_COUNT },
      revealCount: { min: 0, max: 22 },
    });
  });

  it('falls back to default mine count for invalid getLimits input', () => {
    expect(odds.getLimits(0)).toEqual(odds.getLimits(DEFAULT_MINE_COUNT));
    expect(odds.getLimits(25)).toEqual(odds.getLimits(DEFAULT_MINE_COUNT));
    expect(odds.getLimits(1.5)).toEqual(odds.getLimits(DEFAULT_MINE_COUNT));
  });

  it('accepts custom config via constructor', () => {
    const custom = new MinesOdds({
      rtp: 0.99,
      defaultMineCount: 5,
      gridSize: 16,
      minMineCount: 2,
      maxMineCount: 8,
    });

    expect(custom.getDefaultMineCount()).toBe(5);
    expect(custom.getGemCount(4)).toBe(12);
    expect(custom.getLimits(4)).toEqual({
      mineCount: { min: 2, max: 8 },
      revealCount: { min: 0, max: 12 },
    });
    expect(custom.getMultiplier(5, 1)).toBeGreaterThan(
      odds.getMultiplier(5, 1),
    );
    expect(() => custom.getGemCount(1)).toThrow(RangeError);
    expect(() => custom.getMultiplier(4, 13)).toThrow(RangeError);
  });
});
