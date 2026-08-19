import { roundToDecimals } from '../decimal';
import {
  MAX_WIN_CHANCE_PERCENT,
  MIN_MULTIPLIER,
  MIN_WIN_CHANCE_PERCENT,
  MULTIPLIER_DECIMALS,
} from './dice-constants';

export type DiceMultiplierBounds = {
  minMultiplier: number;
  maxMultiplier: number;
};

export const getDiceMultiplierBounds = (rtp: number): DiceMultiplierBounds => ({
  maxMultiplier: roundToDecimals(
    (rtp * 100) / MIN_WIN_CHANCE_PERCENT,
    MULTIPLIER_DECIMALS,
  ),
  minMultiplier: roundToDecimals(
    Math.max(MIN_MULTIPLIER, (rtp * 100) / MAX_WIN_CHANCE_PERCENT),
    MULTIPLIER_DECIMALS,
  ),
});
