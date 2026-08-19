import { roundToDecimals } from '../decimal';
import {
  LIMBO_MULTIPLIER_DECIMALS,
  MAX_CRASH_MULTIPLIER,
  MAX_LIMBO_WIN_CHANCE_PERCENT,
  MIN_LIMBO_WIN_CHANCE_PERCENT,
  MIN_TARGET_MULTIPLIER,
} from './limbo-constants';

export type LimboMultiplierBounds = {
  minMultiplier: number;
  maxMultiplier: number;
};

export const getLimboMultiplierBounds = (
  rtp: number,
): LimboMultiplierBounds => ({
  maxMultiplier: roundToDecimals(
    Math.min(MAX_CRASH_MULTIPLIER, (rtp * 100) / MIN_LIMBO_WIN_CHANCE_PERCENT),
    LIMBO_MULTIPLIER_DECIMALS,
  ),
  minMultiplier: roundToDecimals(
    Math.max(MIN_TARGET_MULTIPLIER, (rtp * 100) / MAX_LIMBO_WIN_CHANCE_PERCENT),
    LIMBO_MULTIPLIER_DECIMALS,
  ),
});
