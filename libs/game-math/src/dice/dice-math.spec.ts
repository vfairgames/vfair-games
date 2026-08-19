import { describe, expect, it } from 'vitest';

import {
  MULTIPLIER_DECIMALS,
  SLIDER_DECIMALS,
  WIN_CHANCE_DECIMALS,
} from './dice-constants';
import {
  createDiceOdds,
  DiceOdds,
  getDiceMultiplierBounds,
  isWon,
  type DiceOddsConfig,
} from './dice-math';

const TEST_BOUNDS = getDiceMultiplierBounds(0.98);

const TEST_CONFIG: DiceOddsConfig = {
  rtp: 0.98,
  minMultiplier: TEST_BOUNDS.minMultiplier,
  maxMultiplier: TEST_BOUNDS.maxMultiplier,
  sliderDecimals: SLIDER_DECIMALS,
  multiplierDecimals: MULTIPLIER_DECIMALS,
  winChanceDecimals: WIN_CHANCE_DECIMALS,
  defaultSliderValue: 50,
};

const dice = new DiceOdds(TEST_CONFIG);
const rollOver = { gameMode: 'rollOver' as const };

const fairMultiplier = (config: DiceOddsConfig, winChance: number): number => {
  const factor = 10 ** config.multiplierDecimals;
  return Math.round(((config.rtp * 100) / winChance) * factor) / factor;
};

const roundToTestSlider = (value: number): number => {
  const factor = 10 ** TEST_CONFIG.sliderDecimals;
  return Math.round(value * factor) / factor;
};

describe('DiceOdds.calculate', () => {
  it('derives slider and win chance from a multiplier input', () => {
    expect(dice.calculate({ ...rollOver, multiplier: 1.96 })).toEqual({
      multiplier: 1.96,
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('derives multiplier and win chance from a slider input', () => {
    expect(dice.calculate({ ...rollOver, sliderValue: 50 })).toEqual({
      multiplier: fairMultiplier(TEST_CONFIG, 50),
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('derives multiplier and slider from a win-chance input', () => {
    expect(dice.calculate({ ...rollOver, winChance: 50 })).toEqual({
      multiplier: fairMultiplier(TEST_CONFIG, 50),
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('rounds slider to the configured decimals', () => {
    expect(dice.calculate({ ...rollOver, sliderValue: 50.5555 })).toEqual({
      multiplier: fairMultiplier(TEST_CONFIG, 49.44),
      sliderValue: 50.56,
      winChance: 49.44,
    });
  });

  it('rounds multiplier to the configured decimals', () => {
    expect(dice.calculate({ ...rollOver, multiplier: 1.96005 })).toEqual({
      multiplier: 1.96,
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('prefers slider when multiple inputs are provided', () => {
    expect(
      dice.calculate({
        ...rollOver,
        sliderValue: 50,
        multiplier: 2,
        winChance: 49.5,
      }),
    ).toEqual({
      multiplier: fairMultiplier(TEST_CONFIG, 50),
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('defaults to the configured slider when no value input is provided', () => {
    expect(dice.calculate({ gameMode: 'rollOver' })).toEqual({
      multiplier: fairMultiplier(TEST_CONFIG, 50),
      sliderValue: TEST_CONFIG.defaultSliderValue,
      winChance: 50,
    });
  });

  it('throws when slider is below the allowed range', () => {
    expect(() => dice.calculate({ ...rollOver, sliderValue: 0 })).toThrow(
      RangeError,
    );
    expect(() => dice.calculate({ ...rollOver, sliderValue: 0 })).toThrow(
      'Slider value must be at least',
    );
  });

  it('throws when slider is above the allowed range', () => {
    expect(() => dice.calculate({ ...rollOver, sliderValue: 100 })).toThrow(
      RangeError,
    );
    expect(() => dice.calculate({ ...rollOver, sliderValue: 100 })).toThrow(
      'Slider value must be at most',
    );
  });

  it('throws when win chance is above the allowed range', () => {
    expect(() => dice.calculate({ ...rollOver, winChance: 100 })).toThrow(
      RangeError,
    );
    expect(() => dice.calculate({ ...rollOver, winChance: 100 })).toThrow(
      'Win chance must be at most',
    );
  });

  it('throws when win chance is below the allowed range', () => {
    const { winChance } = dice.getLimits('rollOver');

    expect(() =>
      dice.calculate({ ...rollOver, winChance: winChance.min / 10 }),
    ).toThrow(RangeError);
  });

  it('throws when multiplier is below the allowed range', () => {
    expect(() => dice.calculate({ ...rollOver, multiplier: 0.5 })).toThrow(
      RangeError,
    );
    expect(() => dice.calculate({ ...rollOver, multiplier: 0.5 })).toThrow(
      'Multiplier must be at least',
    );
  });

  it('throws when multiplier is above the allowed range', () => {
    expect(() =>
      dice.calculate({
        ...rollOver,
        multiplier: TEST_CONFIG.maxMultiplier + 1,
      }),
    ).toThrow(RangeError);
  });

  it('prefers win chance over multiplier when slider is omitted', () => {
    expect(
      dice.calculate({
        ...rollOver,
        winChance: 25,
        multiplier: 2,
      }),
    ).toEqual({
      multiplier: fairMultiplier(TEST_CONFIG, 25),
      sliderValue: 75,
      winChance: 25,
    });
  });

  it('derives win chance from slider in rollUnder mode', () => {
    expect(dice.calculate({ gameMode: 'rollUnder', sliderValue: 50 })).toEqual({
      multiplier: fairMultiplier(TEST_CONFIG, 50),
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('preserves win chance when switching from rollOver to rollUnder', () => {
    const rollOverResult = dice.calculate({
      gameMode: 'rollOver',
      sliderValue: 30,
    });

    expect(
      dice.calculate({
        winChance: rollOverResult.winChance,
        gameMode: 'rollUnder',
      }),
    ).toEqual({
      multiplier: rollOverResult.multiplier,
      sliderValue: 70,
      winChance: rollOverResult.winChance,
    });
  });

  it('snaps a non-clean multiplier to the canonical win-chance result', () => {
    const result = dice.calculate({ ...rollOver, multiplier: 3 });

    expect(result.winChance).toBe(32.67);
    expect(result.sliderValue).toBe(67.33);
    expect(result.multiplier).toBe(fairMultiplier(TEST_CONFIG, 32.67));
    expect(result.multiplier).not.toBe(3);
  });

  it('resolves the rollUnder minimum boundary slider', () => {
    const { sliderValue } = dice.getLimits('rollUnder');

    expect(
      dice.calculate({ gameMode: 'rollUnder', sliderValue: sliderValue.min }),
    ).toEqual({
      multiplier: TEST_CONFIG.maxMultiplier,
      sliderValue: sliderValue.min,
      winChance: sliderValue.min,
    });
  });

  it('resolves the rollUnder maximum boundary slider', () => {
    const { sliderValue, winChance } = dice.getLimits('rollUnder');

    expect(
      dice.calculate({ gameMode: 'rollUnder', sliderValue: sliderValue.max }),
    ).toEqual({
      multiplier: TEST_CONFIG.minMultiplier,
      sliderValue: sliderValue.max,
      winChance: winChance.max,
    });
  });

  it('accepts the exact rollOver win-chance boundaries from getLimits', () => {
    const { winChance } = dice.getLimits('rollOver');

    expect(dice.calculate({ ...rollOver, winChance: winChance.min })).toEqual({
      multiplier: TEST_CONFIG.maxMultiplier,
      sliderValue: roundToTestSlider(100 - winChance.min),
      winChance: winChance.min,
    });

    expect(dice.calculate({ ...rollOver, winChance: winChance.max })).toEqual({
      multiplier: TEST_CONFIG.minMultiplier,
      sliderValue: roundToTestSlider(100 - winChance.max),
      winChance: winChance.max,
    });
  });

  it('accepts the exact rollOver multiplier boundaries from getLimits', () => {
    const { multiplier, winChance } = dice.getLimits('rollOver');

    expect(dice.calculate({ ...rollOver, multiplier: multiplier.min })).toEqual(
      {
        multiplier: TEST_CONFIG.minMultiplier,
        sliderValue: roundToTestSlider(100 - winChance.max),
        winChance: winChance.max,
      },
    );

    expect(dice.calculate({ ...rollOver, multiplier: multiplier.max })).toEqual(
      {
        multiplier: TEST_CONFIG.maxMultiplier,
        sliderValue: roundToTestSlider(100 - winChance.min),
        winChance: winChance.min,
      },
    );
  });
});

describe('DiceOdds.validate', () => {
  const validInput = {
    gameMode: 'rollOver' as const,
    sliderValue: 50,
    winChance: 50,
    multiplier: 1.96,
  };

  it('returns no errors for valid input', () => {
    expect(dice.validate(validInput)).toEqual({});
  });

  it('reports an error when sliderValue is below the minimum', () => {
    const errors = dice.validate({ ...validInput, sliderValue: 0 });

    expect(errors.sliderValue).toMatch('Slider value must be at least');
    expect(errors.winChance).toBeUndefined();
    expect(errors.multiplier).toBeUndefined();
  });

  it('reports an error when sliderValue is above the maximum', () => {
    const errors = dice.validate({ ...validInput, sliderValue: 100 });

    expect(errors.sliderValue).toMatch('Slider value must be at most');
  });

  it('reports an error when winChance is above the maximum', () => {
    const errors = dice.validate({ ...validInput, winChance: 100 });

    expect(errors.winChance).toMatch('Win chance must be at most');
    expect(errors.sliderValue).toBeUndefined();
    expect(errors.multiplier).toBeUndefined();
  });

  it('reports an error when winChance is below the minimum', () => {
    const { winChance } = dice.getLimits('rollOver');
    const errors = dice.validate({
      ...validInput,
      winChance: winChance.min / 10,
    });

    expect(errors.winChance).toMatch('Win chance must be at least');
  });

  it('reports an error when multiplier is below the minimum', () => {
    const errors = dice.validate({ ...validInput, multiplier: 0.5 });

    expect(errors.multiplier).toMatch('Multiplier must be at least');
    expect(errors.sliderValue).toBeUndefined();
    expect(errors.winChance).toBeUndefined();
  });

  it('reports an error when multiplier is above the maximum', () => {
    const errors = dice.validate({
      ...validInput,
      multiplier: TEST_CONFIG.maxMultiplier + 1,
    });

    expect(errors.multiplier).toMatch('Multiplier must be at most');
  });

  it('reports errors for all invalid fields simultaneously', () => {
    const errors = dice.validate({
      gameMode: 'rollOver',
      sliderValue: 0,
      winChance: 100,
      multiplier: 0.5,
    });

    expect(errors.sliderValue).toBeDefined();
    expect(errors.winChance).toBeDefined();
    expect(errors.multiplier).toBeDefined();
  });

  it('validates rollUnder slider limits correctly', () => {
    const { sliderValue } = dice.getLimits('rollUnder');

    expect(
      dice.validate({
        gameMode: 'rollUnder',
        sliderValue: sliderValue.min - 1,
        winChance: 50,
        multiplier: 1.96,
      }).sliderValue,
    ).toMatch('Slider value must be at least');

    expect(
      dice.validate({
        gameMode: 'rollUnder',
        sliderValue: sliderValue.min,
        winChance: 50,
        multiplier: 1.96,
      }).sliderValue,
    ).toBeUndefined();
  });

  it('accepts exact boundary values without errors', () => {
    const { sliderValue, winChance, multiplier } = dice.getLimits('rollOver');

    expect(
      dice.validate({
        gameMode: 'rollOver',
        sliderValue: sliderValue.min,
        winChance: winChance.min,
        multiplier: multiplier.max,
      }),
    ).toEqual({});

    expect(
      dice.validate({
        gameMode: 'rollOver',
        sliderValue: sliderValue.max,
        winChance: winChance.max,
        multiplier: multiplier.min,
      }),
    ).toEqual({});
  });
});

describe('isWon', () => {
  it('wins rollUnder only when the roll is below the slider', () => {
    expect(
      isWon({
        gameMode: 'rollUnder',
        rolledValue: 49.99,
        sliderValue: 50,
      }),
    ).toBe(true);
    expect(
      isWon({
        gameMode: 'rollUnder',
        rolledValue: 50,
        sliderValue: 50,
      }),
    ).toBe(false);
  });

  it('wins rollOver when the roll is at or above the slider', () => {
    expect(
      isWon({
        gameMode: 'rollOver',
        rolledValue: 50,
        sliderValue: 50,
      }),
    ).toBe(true);
    expect(
      isWon({
        gameMode: 'rollOver',
        rolledValue: 49.99,
        sliderValue: 50,
      }),
    ).toBe(false);
  });

  it('allows rollOver 99.99 to win on the highest generated roll', () => {
    expect(
      isWon({
        gameMode: 'rollOver',
        rolledValue: 99.99,
        sliderValue: 99.99,
      }),
    ).toBe(true);
  });

  it('rounds roll and slider values to dice precision before comparing', () => {
    expect(
      isWon({
        gameMode: 'rollOver',
        rolledValue: 49.999,
        sliderValue: 50,
      }),
    ).toBe(true);
  });
});

describe('Dice RTP multiplier', () => {
  it('returns 1.96 at 50% win chance when rtp is 0.98', () => {
    const odds = createDiceOdds(0.98);

    expect(odds.calculate({ gameMode: 'rollOver', winChance: 50 })).toEqual({
      multiplier: 1.96,
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('returns 1.98 at 50% win chance when rtp is 0.99', () => {
    const odds = createDiceOdds(0.99);

    expect(odds.calculate({ gameMode: 'rollOver', winChance: 50 })).toEqual({
      multiplier: 1.98,
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('targets rtp as expected return per unit bet at 50% win chance', () => {
    const bet = 2;
    const rtp = 0.98;
    const odds = createDiceOdds(rtp);
    const { multiplier, winChance } = odds.calculate({
      gameMode: 'rollOver',
      winChance: 50,
    });

    const expectedReturn = (winChance / 100) * bet * multiplier;

    expect(multiplier).toBe(1.96);
    expect(expectedReturn).toBeCloseTo(bet * rtp, 10);
  });

  it('pins multiplier formula at non-50% win chances', () => {
    const odds = createDiceOdds(0.98);

    expect(odds.calculate({ gameMode: 'rollOver', winChance: 25 })).toEqual({
      multiplier: 3.92,
      sliderValue: 75,
      winChance: 25,
    });
    expect(odds.calculate({ gameMode: 'rollOver', winChance: 10 })).toEqual({
      multiplier: 9.8,
      sliderValue: 90,
      winChance: 10,
    });
  });

  it('targets rtp as expected return at non-50% win chance', () => {
    const bet = 5;
    const rtp = 0.98;
    const odds = createDiceOdds(rtp);
    const { multiplier, winChance } = odds.calculate({
      gameMode: 'rollOver',
      winChance: 25,
    });

    expect((winChance / 100) * bet * multiplier).toBeCloseTo(bet * rtp, 10);
  });
});

describe('DiceOdds with a custom config', () => {
  it('scales the multiplier with the configured rtp', () => {
    const lowEdge = createDiceOdds(0.99);

    expect(lowEdge.calculate({ gameMode: 'rollOver', winChance: 50 })).toEqual({
      multiplier: 1.98,
      sliderValue: 50,
      winChance: 50,
    });
  });

  it('keeps rollOver slider 99.99 valid when rtp is 0.99', () => {
    const odds = createDiceOdds(0.99);
    const { sliderValue, multiplier } = odds.getLimits('rollOver');

    expect(sliderValue.max).toBe(99.99);
    expect(
      odds.calculate({ gameMode: 'rollOver', sliderValue: 99.99 }),
    ).toEqual({
      multiplier: 9900,
      sliderValue: 99.99,
      winChance: 0.01,
    });
    expect(multiplier.max).toBe(9900);
  });

  it('caps rollUnder slider by the 1.01 minimum multiplier floor', () => {
    const odds = createDiceOdds(0.98);
    const { sliderValue } = odds.getLimits('rollUnder');

    expect(sliderValue.max).toBe(97.03);
  });

  it('shifts the win-chance limits with the configured multiplier bounds', () => {
    const narrow = new DiceOdds({ minMultiplier: 2, maxMultiplier: 100 });
    const limits = narrow.getLimits('rollOver');

    expect(limits.multiplier).toEqual({ min: 2, max: 100 });
    expect(limits.winChance.max).toBe(49);
    expect(limits.winChance.min).toBe(0.98);
  });

  it('honors a custom default slider value', () => {
    const custom = new DiceOdds({ defaultSliderValue: 25 });

    expect(custom.calculate({ gameMode: 'rollOver' }).sliderValue).toBe(25);
  });
});
