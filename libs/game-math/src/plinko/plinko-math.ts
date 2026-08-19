import { roundToDecimals } from '../decimal';
import {
  isPlinkoRisk,
  isPlinkoRows,
  MAX_PLINKO_ROWS,
  MIN_PLINKO_ROWS,
  PLINKO_MULTIPLIER_DECIMALS,
  PLINKO_RISKS,
  type PlinkoRisk,
} from './plinko-constants';
import { getBasePlinkoMultipliers } from './plinko-multipliers';

type PlinkoOddsLimits = {
  rows: { min: number; max: number };
  risk: readonly PlinkoRisk[];
};

type PlinkoOddsValidationErrors = Partial<Record<'rows' | 'risk', string>>;

const assertRows = (rows: number): void => {
  if (!isPlinkoRows(rows)) {
    throw new RangeError(
      `Rows must be an integer between ${MIN_PLINKO_ROWS} and ${MAX_PLINKO_ROWS}`,
    );
  }
};

const assertRisk = (risk: string): void => {
  if (!isPlinkoRisk(risk)) {
    throw new RangeError(`Risk must be one of: ${PLINKO_RISKS.join(', ')}`);
  }
};

const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) {
    return 0;
  }

  let result = 1;

  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - k + i)) / i;
  }

  return result;
};

export const getPlinkoBucketProbabilities = (rows: number): number[] => {
  assertRows(rows);
  const total = 2 ** rows;
  return Array.from(
    { length: rows + 1 },
    (_, bucket) => choose(rows, bucket) / total,
  );
};

export const calculatePlinkoExpectedReturn = (
  multipliers: readonly number[],
  rows: number,
): number => {
  const probabilities = getPlinkoBucketProbabilities(rows);
  let expected = 0;

  for (let index = 0; index < multipliers.length; index += 1) {
    expected += multipliers[index] * probabilities[index];
  }

  return expected;
};

class PlinkoOdds {
  getLimits(): PlinkoOddsLimits {
    return {
      rows: { min: MIN_PLINKO_ROWS, max: MAX_PLINKO_ROWS },
      risk: PLINKO_RISKS,
    };
  }

  getMultipliers(rows: number, risk: PlinkoRisk): number[] {
    assertRows(rows);
    assertRisk(risk);
    return getBasePlinkoMultipliers(rows, risk).map((multiplier) =>
      roundToDecimals(multiplier, PLINKO_MULTIPLIER_DECIMALS),
    );
  }

  getMultiplier(rows: number, risk: PlinkoRisk, bucketIndex: number): number {
    const multipliers = this.getMultipliers(rows, risk);

    if (
      !Number.isInteger(bucketIndex) ||
      bucketIndex < 0 ||
      bucketIndex >= multipliers.length
    ) {
      throw new RangeError(
        `Bucket index must be an integer between 0 and ${multipliers.length - 1}`,
      );
    }

    return multipliers[bucketIndex];
  }

  validate(input: { rows: number; risk: string }): PlinkoOddsValidationErrors {
    const errors: PlinkoOddsValidationErrors = {};

    if (!isPlinkoRows(input.rows)) {
      errors.rows = `Rows must be an integer between ${MIN_PLINKO_ROWS} and ${MAX_PLINKO_ROWS}`;
    }

    if (!isPlinkoRisk(input.risk)) {
      errors.risk = `Risk must be one of: ${PLINKO_RISKS.join(', ')}`;
    }

    return errors;
  }
}

export type { PlinkoOdds };

export const createPlinkoOdds = (): PlinkoOdds => new PlinkoOdds();
