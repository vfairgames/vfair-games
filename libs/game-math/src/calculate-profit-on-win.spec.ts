import { describe, expect, it } from 'vitest';

import { calculateProfitOnWin } from './calculate-profit-on-win';

describe('calculateProfitOnWin', () => {
  it('returns pure profit excluding the stake', () => {
    expect(calculateProfitOnWin(10, 2, 2)).toBe(10);
  });

  it('rounds to the given decimal places', () => {
    expect(calculateProfitOnWin(10, 1.96, 2)).toBe(9.6);
    expect(calculateProfitOnWin(10, 1.469999, 2)).toBe(4.7);
  });

  it('returns zero when multiplier is 1', () => {
    expect(calculateProfitOnWin(10, 1, 2)).toBe(0);
  });

  it('avoids binary float drift on fractional bets', () => {
    expect(calculateProfitOnWin(0.1, 2, 2)).toBe(0.1);
    expect(calculateProfitOnWin(0.1, 1.96, 2)).toBe(0.1);
  });

  it('subtracts one from multiplier in minor units', () => {
    expect(calculateProfitOnWin(10, 1.96, 2)).toBe(9.6);
    expect(calculateProfitOnWin(10, 1.469999, 2)).toBe(4.7);
  });

  it('honors a custom multiplierDecimals value', () => {
    expect(calculateProfitOnWin(10, 1.96555, 2, 2)).toBe(9.7);
    expect(calculateProfitOnWin(10, 1.96555, 2, 4)).toBe(9.66);
  });

  it('returns a negative profit when multiplier is below one', () => {
    expect(calculateProfitOnWin(10, 0.5, 2)).toBe(-5);
  });

  it('supports higher currency decimals', () => {
    expect(calculateProfitOnWin(0.1234, 2, 4)).toBe(0.1234);
    expect(calculateProfitOnWin(1.23456789, 1.5, 8)).toBe(0.61728395);
  });

  it('rounds the bet amount before multiplying', () => {
    expect(calculateProfitOnWin(1.005, 2, 2)).toBe(1.01);
  });
});
