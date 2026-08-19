import { fromMinorUnits, toMinorUnits } from '../decimal';
import { DEFAULT_GAME_RTP, RTP_DECIMALS } from '../game-rtp';
import {
  DEFAULT_MINE_COUNT,
  MAX_MINE_COUNT,
  MIN_MINE_COUNT,
  MINES_GRID_SIZE,
  MINES_MULTIPLIER_DECIMALS,
} from './mines-constants';

type MinesOddsConfig = {
  rtp: number;
  gridSize: number;
  minMineCount: number;
  maxMineCount: number;
  multiplierDecimals: number;
  defaultMineCount: number;
};

type MinesOddsLimits = {
  mineCount: { min: number; max: number };
  revealCount: { min: number; max: number };
};

type MinesOddsValidationErrors = Partial<
  Record<'mineCount' | 'revealCount', string>
>;

const DEFAULT_MINES_ODDS_CONFIG: MinesOddsConfig = {
  rtp: DEFAULT_GAME_RTP,
  gridSize: MINES_GRID_SIZE,
  minMineCount: MIN_MINE_COUNT,
  maxMineCount: MAX_MINE_COUNT,
  multiplierDecimals: MINES_MULTIPLIER_DECIMALS,
  defaultMineCount: DEFAULT_MINE_COUNT,
};

export const getGemCount = (
  mineCount: number,
  gridSize = MINES_GRID_SIZE,
): number => gridSize - mineCount;

export const isMineHit = (
  tile: number,
  mineLayout: readonly number[],
): boolean => mineLayout.includes(tile);

const assertMineCount = (mineCount: number, config: MinesOddsConfig): void => {
  if (
    !Number.isInteger(mineCount) ||
    mineCount < config.minMineCount ||
    mineCount > config.maxMineCount
  ) {
    throw new RangeError(
      `Mine count must be an integer between ${config.minMineCount} and ${config.maxMineCount}`,
    );
  }
};

const assertRevealCount = (
  mineCount: number,
  revealCount: number,
  config: MinesOddsConfig,
): void => {
  const maxReveals = getGemCount(mineCount, config.gridSize);

  if (
    !Number.isInteger(revealCount) ||
    revealCount < 0 ||
    revealCount > maxReveals
  ) {
    throw new RangeError(
      `Reveal count must be an integer between 0 and ${maxReveals}`,
    );
  }
};

class MinesOdds {
  private readonly config: MinesOddsConfig;

  constructor(config: Partial<MinesOddsConfig> = {}) {
    this.config = { ...DEFAULT_MINES_ODDS_CONFIG, ...config };
  }

  getGemCount(mineCount: number): number {
    assertMineCount(mineCount, this.config);
    return getGemCount(mineCount, this.config.gridSize);
  }

  getLimits(mineCount = this.config.defaultMineCount): MinesOddsLimits {
    const safeMineCount =
      Number.isInteger(mineCount) &&
      mineCount >= this.config.minMineCount &&
      mineCount <= this.config.maxMineCount
        ? mineCount
        : this.config.defaultMineCount;

    return {
      mineCount: {
        min: this.config.minMineCount,
        max: this.config.maxMineCount,
      },
      revealCount: {
        min: 0,
        max: getGemCount(safeMineCount, this.config.gridSize),
      },
    };
  }

  validate(input: {
    mineCount: number;
    revealCount?: number;
  }): MinesOddsValidationErrors {
    const errors: MinesOddsValidationErrors = {};
    const { mineCount, revealCount } = input;

    if (
      !Number.isInteger(mineCount) ||
      mineCount < this.config.minMineCount ||
      mineCount > this.config.maxMineCount
    ) {
      errors.mineCount = `Mine count must be an integer between ${this.config.minMineCount} and ${this.config.maxMineCount}`;
    }

    if (revealCount !== undefined && errors.mineCount === undefined) {
      const maxReveals = this.getGemCount(mineCount);

      if (
        !Number.isInteger(revealCount) ||
        revealCount < 0 ||
        revealCount > maxReveals
      ) {
        errors.revealCount = `Reveal count must be an integer between 0 and ${maxReveals}`;
      }
    }

    return errors;
  }

  getMultiplier(mineCount: number, revealCount: number): number {
    assertMineCount(mineCount, this.config);
    assertRevealCount(mineCount, revealCount, this.config);

    if (revealCount === 0) {
      return 1;
    }

    let numerator = BigInt(1);
    let denominator = BigInt(1);

    for (let i = 0; i < revealCount; i += 1) {
      numerator *= BigInt(this.config.gridSize - i);
      denominator *= BigInt(this.config.gridSize - mineCount - i);
    }

    const { rtp, multiplierDecimals } = this.config;
    const rtpMinor = BigInt(toMinorUnits(rtp, RTP_DECIMALS));
    const scale = BigInt(10 ** multiplierDecimals);
    const rtpScale = BigInt(10 ** RTP_DECIMALS);
    const dividend = rtpMinor * numerator * scale;
    const divisor = denominator * rtpScale;
    const resultMinor = (dividend + divisor / BigInt(2)) / divisor;

    return fromMinorUnits(Number(resultMinor), multiplierDecimals);
  }

  getDefaultMineCount(): number {
    return this.config.defaultMineCount;
  }
}

export const createMinesOdds = (rtp: number): MinesOdds =>
  new MinesOdds({ rtp });

export { MinesOdds };
