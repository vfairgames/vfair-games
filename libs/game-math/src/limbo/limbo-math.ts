import { roundToDecimals } from '../decimal';
import { DEFAULT_GAME_RTP } from '../game-rtp';
import {
  CRASH_MULTIPLIER_DECIMALS,
  DEFAULT_TARGET_MULTIPLIER,
  LIMBO_MULTIPLIER_DECIMALS,
  LIMBO_WIN_CHANCE_DECIMALS,
} from './limbo-constants';
import { getLimboMultiplierBounds } from './limbo-rtp-bounds';

export interface LimboOddsInput {
  targetMultiplier?: number;
  winChance?: number;
}

export interface LimboOddsResult {
  targetMultiplier: number;
  winChance: number;
}

export interface LimboOddsFullInput {
  targetMultiplier: number;
  winChance: number;
}

export type LimboWinInput = {
  rolledMultiplier: number;
  targetMultiplier: number;
};

export type LimboOddsValidationErrors = Partial<
  Record<'targetMultiplier' | 'winChance', string>
>;

export type LimboOddsConfig = {
  rtp: number;
  minMultiplier: number;
  maxMultiplier: number;
  multiplierDecimals: number;
  winChanceDecimals: number;
  defaultTargetMultiplier: number;
};

export type LimboOddsLimits = {
  targetMultiplier: { min: number; max: number };
  winChance: { min: number; max: number };
};

const DEFAULT_LIMBO_BOUNDS = getLimboMultiplierBounds(DEFAULT_GAME_RTP);

const DEFAULT_LIMBO_ODDS_CONFIG: LimboOddsConfig = {
  rtp: DEFAULT_GAME_RTP,
  minMultiplier: DEFAULT_LIMBO_BOUNDS.minMultiplier,
  maxMultiplier: DEFAULT_LIMBO_BOUNDS.maxMultiplier,
  multiplierDecimals: LIMBO_MULTIPLIER_DECIMALS,
  winChanceDecimals: LIMBO_WIN_CHANCE_DECIMALS,
  defaultTargetMultiplier: DEFAULT_TARGET_MULTIPLIER,
};

type OddsField = 'targetMultiplier' | 'winChance';

const FIELD_LABELS: Record<OddsField, string> = {
  targetMultiplier: 'Target multiplier',
  winChance: 'Win chance',
};

const calculateLimboMultiplierForWinChance = (
  rtp: number,
  winChancePercent: number,
  multiplierDecimals = LIMBO_MULTIPLIER_DECIMALS,
): number =>
  roundToDecimals((rtp * 100) / winChancePercent, multiplierDecimals);

const calculateWinChanceForLimboMultiplier = (
  rtp: number,
  multiplier: number,
  winChanceDecimals = LIMBO_WIN_CHANCE_DECIMALS,
): number => roundToDecimals((rtp * 100) / multiplier, winChanceDecimals);

export const isLimboWon = ({
  rolledMultiplier,
  targetMultiplier,
}: LimboWinInput): boolean => {
  const rolled = roundToDecimals(rolledMultiplier, CRASH_MULTIPLIER_DECIMALS);
  const target = roundToDecimals(targetMultiplier, LIMBO_MULTIPLIER_DECIMALS);

  return rolled >= target;
};

class LimboOdds {
  private readonly config: LimboOddsConfig;

  constructor(config: Partial<LimboOddsConfig> = {}) {
    this.config = { ...DEFAULT_LIMBO_ODDS_CONFIG, ...config };
  }

  getLimits(): LimboOddsLimits {
    const minWinChance = this.winChanceForMultiplier(this.config.maxMultiplier);
    const maxWinChance = this.winChanceForMultiplier(this.config.minMultiplier);
    const { winChanceDecimals } = this.config;

    return {
      targetMultiplier: {
        min: this.config.minMultiplier,
        max: this.config.maxMultiplier,
      },
      winChance: {
        min: roundToDecimals(minWinChance, winChanceDecimals),
        max: roundToDecimals(maxWinChance, winChanceDecimals),
      },
    };
  }

  validate(input: LimboOddsFullInput): LimboOddsValidationErrors {
    const errors: LimboOddsValidationErrors = {};
    const fields: OddsField[] = ['targetMultiplier', 'winChance'];

    for (const field of fields) {
      const bounds = this.getLimits()[field];
      const rounded = roundToDecimals(
        input[field],
        this.decimalsForField(field),
      );

      if (rounded < bounds.min) {
        errors[field] = `${FIELD_LABELS[field]} must be at least ${bounds.min}`;
      } else if (rounded > bounds.max) {
        errors[field] = `${FIELD_LABELS[field]} must be at most ${bounds.max}`;
      }
    }

    return errors;
  }

  calculate(input: LimboOddsInput = {}): LimboOddsResult {
    if (input.winChance !== undefined) {
      this.assertWithinLimits('winChance', input.winChance);
      return this.resolveFromWinChance(input.winChance);
    }

    if (input.targetMultiplier !== undefined) {
      this.assertWithinLimits('targetMultiplier', input.targetMultiplier);
      return this.resolveFromTargetMultiplier(input.targetMultiplier);
    }

    return this.resolveFromTargetMultiplier(
      this.config.defaultTargetMultiplier,
    );
  }

  private winChanceForMultiplier(multiplier: number): number {
    return calculateWinChanceForLimboMultiplier(
      this.config.rtp,
      multiplier,
      this.config.winChanceDecimals,
    );
  }

  private decimalsForField(field: OddsField): number {
    if (field === 'targetMultiplier') {
      return this.config.multiplierDecimals;
    }
    return this.config.winChanceDecimals;
  }

  private assertWithinLimits(field: OddsField, value: number): void {
    const bounds = this.getLimits()[field];
    const clamped = roundToDecimals(value, this.decimalsForField(field));

    if (clamped < bounds.min) {
      throw new RangeError(
        `${FIELD_LABELS[field]} must be at least ${bounds.min}`,
      );
    }

    if (clamped > bounds.max) {
      throw new RangeError(
        `${FIELD_LABELS[field]} must be at most ${bounds.max}`,
      );
    }
  }

  private resolveFromWinChance(winChanceRaw: number): LimboOddsResult {
    const winChance = roundToDecimals(
      winChanceRaw,
      this.config.winChanceDecimals,
    );
    const targetMultiplier = calculateLimboMultiplierForWinChance(
      this.config.rtp,
      winChance,
      this.config.multiplierDecimals,
    );

    return { targetMultiplier, winChance };
  }

  private resolveFromTargetMultiplier(
    targetMultiplierRaw: number,
  ): LimboOddsResult {
    const targetMultiplier = roundToDecimals(
      targetMultiplierRaw,
      this.config.multiplierDecimals,
    );

    return {
      targetMultiplier,
      winChance: this.winChanceForMultiplier(targetMultiplier),
    };
  }
}

export const createLimboOdds = (rtp: number): LimboOdds => {
  const { minMultiplier, maxMultiplier } = getLimboMultiplierBounds(rtp);

  return new LimboOdds({ rtp, minMultiplier, maxMultiplier });
};

export { LimboOdds };
