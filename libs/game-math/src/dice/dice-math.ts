import { roundToDecimals } from '../decimal';
import { DEFAULT_GAME_RTP } from '../game-rtp';
import {
  DEFAULT_SLIDER_VALUE,
  MULTIPLIER_DECIMALS,
  SLIDER_DECIMALS,
  WIN_CHANCE_DECIMALS,
} from './dice-constants';
import { getDiceMultiplierBounds } from './dice-rtp-bounds';

type DiceGameMode = 'rollOver' | 'rollUnder';

export interface DiceOddsInput {
  gameMode: DiceGameMode;
  multiplier?: number;
  sliderValue?: number;
  winChance?: number;
}

export interface DiceOddsResult {
  multiplier: number;
  sliderValue: number;
  winChance: number;
}

export interface DiceOddsFullInput {
  gameMode: DiceGameMode;
  multiplier: number;
  sliderValue: number;
  winChance: number;
}

export type DiceWinInput = {
  gameMode: DiceGameMode;
  rolledValue: number;
  sliderValue: number;
};

export type DiceOddsValidationErrors = Partial<
  Record<'sliderValue' | 'winChance' | 'multiplier', string>
>;

export type DiceOddsConfig = {
  rtp: number;
  minMultiplier: number;
  maxMultiplier: number;
  sliderDecimals: number;
  multiplierDecimals: number;
  winChanceDecimals: number;
  defaultSliderValue: number;
};

export type DiceOddsLimits = {
  multiplier: { min: number; max: number };
  winChance: { min: number; max: number };
  sliderValue: { min: number; max: number };
};

const DEFAULT_DICE_BOUNDS = getDiceMultiplierBounds(DEFAULT_GAME_RTP);

const DEFAULT_DICE_ODDS_CONFIG: DiceOddsConfig = {
  rtp: DEFAULT_GAME_RTP,
  minMultiplier: DEFAULT_DICE_BOUNDS.minMultiplier,
  maxMultiplier: DEFAULT_DICE_BOUNDS.maxMultiplier,
  sliderDecimals: SLIDER_DECIMALS,
  multiplierDecimals: MULTIPLIER_DECIMALS,
  winChanceDecimals: WIN_CHANCE_DECIMALS,
  defaultSliderValue: DEFAULT_SLIDER_VALUE,
};

type OddsField = 'sliderValue' | 'winChance' | 'multiplier';

const FIELD_LABELS: Record<OddsField, string> = {
  sliderValue: 'Slider value',
  winChance: 'Win chance',
  multiplier: 'Multiplier',
};

export const calculateDiceMultiplierForWinChance = (
  rtp: number,
  winChancePercent: number,
  multiplierDecimals = MULTIPLIER_DECIMALS,
): number =>
  roundToDecimals((rtp * 100) / winChancePercent, multiplierDecimals);

export const calculateWinChanceForDiceMultiplier = (
  rtp: number,
  multiplier: number,
  winChanceDecimals = WIN_CHANCE_DECIMALS,
): number => roundToDecimals((rtp * 100) / multiplier, winChanceDecimals);

export const isWon = ({
  gameMode,
  rolledValue,
  sliderValue,
}: DiceWinInput): boolean => {
  const roll = roundToDecimals(rolledValue, SLIDER_DECIMALS);
  const target = roundToDecimals(sliderValue, SLIDER_DECIMALS);

  return gameMode === 'rollUnder' ? roll < target : roll >= target;
};

class DiceOdds {
  private readonly config: DiceOddsConfig;

  constructor(config: Partial<DiceOddsConfig> = {}) {
    this.config = { ...DEFAULT_DICE_ODDS_CONFIG, ...config };
  }

  getLimits(gameMode: DiceGameMode): DiceOddsLimits {
    const minWinChance = this.winChanceForMultiplier(this.config.maxMultiplier);
    const maxWinChance = this.winChanceForMultiplier(this.config.minMultiplier);
    const { sliderDecimals, winChanceDecimals } = this.config;

    const sliderValue =
      gameMode === 'rollOver'
        ? {
            min: roundToDecimals(100 - maxWinChance, sliderDecimals),
            max: roundToDecimals(100 - minWinChance, sliderDecimals),
          }
        : {
            min: roundToDecimals(minWinChance, sliderDecimals),
            max: roundToDecimals(maxWinChance, sliderDecimals),
          };

    return {
      multiplier: {
        min: this.config.minMultiplier,
        max: this.config.maxMultiplier,
      },
      winChance: {
        min: roundToDecimals(minWinChance, winChanceDecimals),
        max: roundToDecimals(maxWinChance, winChanceDecimals),
      },
      sliderValue,
    };
  }

  validate(input: DiceOddsFullInput): DiceOddsValidationErrors {
    const errors: DiceOddsValidationErrors = {};
    const fields: OddsField[] = ['sliderValue', 'winChance', 'multiplier'];

    for (const field of fields) {
      const bounds = this.getLimits(input.gameMode)[field];
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

  calculate(input: DiceOddsInput): DiceOddsResult {
    const { gameMode } = input;

    if (input.sliderValue !== undefined) {
      this.assertWithinLimits('sliderValue', input.sliderValue, gameMode);
      return this.resolveFromSlider(input.sliderValue, gameMode);
    }

    if (input.winChance !== undefined) {
      this.assertWithinLimits('winChance', input.winChance, gameMode);
      return this.resolveFromWinChance(input.winChance, gameMode);
    }

    if (input.multiplier !== undefined) {
      this.assertWithinLimits('multiplier', input.multiplier, gameMode);
      return this.resolveFromMultiplier(input.multiplier, gameMode);
    }

    return this.resolveFromSlider(this.config.defaultSliderValue, gameMode);
  }

  private winChanceForMultiplier(multiplier: number): number {
    return calculateWinChanceForDiceMultiplier(this.config.rtp, multiplier);
  }

  private decimalsForField(field: OddsField): number {
    if (field === 'multiplier') {
      return this.config.multiplierDecimals;
    }
    if (field === 'winChance') {
      return this.config.winChanceDecimals;
    }
    return this.config.sliderDecimals;
  }

  private assertWithinLimits(
    field: OddsField,
    value: number,
    gameMode: DiceGameMode,
  ): void {
    const bounds = this.getLimits(gameMode)[field];
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

  private winChanceFromSlider(
    sliderValue: number,
    gameMode: DiceGameMode,
  ): number {
    const raw = gameMode === 'rollOver' ? 100 - sliderValue : sliderValue;
    return roundToDecimals(raw, this.config.winChanceDecimals);
  }

  private resolveFromSlider(
    sliderRaw: number,
    gameMode: DiceGameMode,
  ): DiceOddsResult {
    const sliderValue = roundToDecimals(sliderRaw, this.config.sliderDecimals);
    const winChance = this.winChanceFromSlider(sliderValue, gameMode);
    const multiplier = calculateDiceMultiplierForWinChance(
      this.config.rtp,
      winChance,
      this.config.multiplierDecimals,
    );

    return { multiplier, sliderValue, winChance };
  }

  private resolveFromWinChance(
    winChanceRaw: number,
    gameMode: DiceGameMode,
  ): DiceOddsResult {
    const winChance = roundToDecimals(
      winChanceRaw,
      this.config.winChanceDecimals,
    );
    const sliderRaw = gameMode === 'rollOver' ? 100 - winChance : winChance;
    return this.resolveFromSlider(sliderRaw, gameMode);
  }

  private resolveFromMultiplier(
    multiplierRaw: number,
    gameMode: DiceGameMode,
  ): DiceOddsResult {
    const multiplier = roundToDecimals(
      multiplierRaw,
      this.config.multiplierDecimals,
    );
    return this.resolveFromWinChance(
      this.winChanceForMultiplier(multiplier),
      gameMode,
    );
  }
}

export const createDiceOdds = (rtp: number): DiceOdds => {
  const { minMultiplier, maxMultiplier } = getDiceMultiplierBounds(rtp);

  return new DiceOdds({ rtp, minMultiplier, maxMultiplier });
};

export const diceMath = createDiceOdds(DEFAULT_GAME_RTP);

export { DiceOdds };
export { getDiceMultiplierBounds } from './dice-rtp-bounds';
export type { DiceMultiplierBounds } from './dice-rtp-bounds';
