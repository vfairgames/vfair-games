import {
  isKenoPick,
  isKenoPickCount,
  isKenoRisk,
  MAX_KENO_PICKS,
  MIN_KENO_PICKS,
  type KenoRisk,
} from './keno-constants';
import { getBaseKenoMultipliers } from './keno-multipliers';
import { getKenoHitProbability } from './keno-probability';

type KenoOddsLimits = {
  picks: { min: number; max: number };
  risk: readonly KenoRisk[];
};

type KenoOddsValidationErrors = Partial<Record<'picks' | 'risk', string>>;

type KenoValidateInput = {
  picks: readonly number[];
  risk: string;
};

const assertPickCount = (pickCount: number): void => {
  if (!isKenoPickCount(pickCount)) {
    throw new RangeError(
      `Pick count must be an integer between ${MIN_KENO_PICKS} and ${MAX_KENO_PICKS}`,
    );
  }
};

const assertRisk = (risk: string): void => {
  if (!isKenoRisk(risk)) {
    throw new RangeError(`Risk must be one of: classic, low, medium, high`);
  }
};

const normalizePicks = (picks: readonly number[]): number[] => {
  const unique = [...new Set(picks)];

  if (unique.length !== picks.length) {
    throw new RangeError('Picks must be unique');
  }

  for (const pick of unique) {
    if (!isKenoPick(pick)) {
      throw new RangeError('Each pick must be an integer between 1 and 40');
    }
  }

  return unique.sort((left, right) => left - right);
};

class KenoOdds {
  getLimits(): KenoOddsLimits {
    return {
      picks: { min: MIN_KENO_PICKS, max: MAX_KENO_PICKS },
      risk: ['classic', 'low', 'medium', 'high'],
    };
  }

  getHitProbability(pickCount: number, hitCount: number): number {
    assertPickCount(pickCount);
    return getKenoHitProbability(pickCount, hitCount);
  }

  getPaytable(pickCount: number, risk: KenoRisk): number[] {
    assertPickCount(pickCount);
    assertRisk(risk);
    return [...getBaseKenoMultipliers(pickCount, risk)];
  }

  getMultiplier(pickCount: number, risk: KenoRisk, hitCount: number): number {
    const paytable = this.getPaytable(pickCount, risk);

    if (!Number.isInteger(hitCount) || hitCount < 0 || hitCount > pickCount) {
      throw new RangeError(
        `Hit count must be an integer between 0 and ${pickCount}`,
      );
    }

    return paytable[hitCount] ?? 0;
  }

  countHits(picks: readonly number[], drawnNumbers: readonly number[]): number {
    const drawn = new Set(drawnNumbers);
    return picks.filter((pick) => drawn.has(pick)).length;
  }

  validate(input: KenoValidateInput): KenoOddsValidationErrors {
    const errors: KenoOddsValidationErrors = {};

    try {
      const picks = normalizePicks(input.picks);

      if (picks.length < MIN_KENO_PICKS || picks.length > MAX_KENO_PICKS) {
        errors.picks = `Select between ${MIN_KENO_PICKS} and ${MAX_KENO_PICKS} numbers`;
      }
    } catch (error: unknown) {
      errors.picks =
        error instanceof Error ? error.message : 'Invalid pick selection';
    }

    if (!isKenoRisk(input.risk)) {
      errors.risk = 'Risk must be one of: classic, low, medium, high';
    }

    return errors;
  }

  normalizePicks(picks: readonly number[]): number[] {
    return normalizePicks(picks);
  }
}

export type { KenoOdds };

export const createKenoOdds = (): KenoOdds => new KenoOdds();
