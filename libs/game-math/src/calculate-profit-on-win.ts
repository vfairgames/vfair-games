import {
  fromMinorUnits,
  multiplyDecimals,
  roundToDecimals,
  toMinorUnits,
} from './decimal';

const DEFAULT_MULTIPLIER_DECIMALS = 4;

export const calculateProfitOnWin = (
  betAmount: number,
  multiplier: number,
  decimals: number,
  multiplierDecimals = DEFAULT_MULTIPLIER_DECIMALS,
): number => {
  const bet = roundToDecimals(betAmount, decimals);
  const mult = roundToDecimals(multiplier, multiplierDecimals);
  const multiplierMinusOne = fromMinorUnits(
    toMinorUnits(mult, multiplierDecimals) - 10 ** multiplierDecimals,
    multiplierDecimals,
  );

  return multiplyDecimals(
    { value: bet, decimals },
    { value: multiplierMinusOne, decimals: multiplierDecimals },
    decimals,
  );
};
