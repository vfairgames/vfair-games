import { createDiceOdds, DEFAULT_GAME_RTP } from '@vfair/game-math';
import { describe, expect, it } from 'vitest';

import {
  applyFormPatch,
  getDiceBetActions,
  hasAutoBetSettingsErrors,
  initialDiceForm,
} from './dice-form';

const diceOdds = createDiceOdds(DEFAULT_GAME_RTP);
const limits = { minBet: 1, maxBet: 100, maxWin: 1000, currencyDecimals: 2 };

const validForm = () => ({
  ...initialDiceForm(diceOdds),
  betAmount: 10,
});

describe('initialDiceForm', () => {
  it('initializes slider value to 50', () => {
    expect(initialDiceForm(diceOdds).sliderValue).toBe(50);
  });
});

describe('applyFormPatch', () => {
  it('accepts a valid form', () => {
    const result = applyFormPatch(validForm(), {}, limits, diceOdds);

    expect(result.isValid).toBe(true);
    expect(result.canPlaceManualBet).toBe(true);
    expect(result.canStartAutoBet).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('rejects bet amount below minBet', () => {
    const result = applyFormPatch(
      validForm(),
      { betAmount: 0.5 },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(false);
    expect(result.canPlaceManualBet).toBe(false);
    expect(result.canStartAutoBet).toBe(false);
    expect(result.errors.betAmount).toBeDefined();
  });

  it('rejects bet amount above maxBet', () => {
    const result = applyFormPatch(
      validForm(),
      { betAmount: 200 },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.betAmount).toBeDefined();
  });

  it('rejects bet amount when profit on win exceeds maxWin', () => {
    const result = applyFormPatch(
      validForm(),
      { betAmount: 90 },
      { ...limits, maxWin: 10 },
      diceOdds,
    );

    expect(result.isValid).toBe(false);
    expect(result.canPlaceManualBet).toBe(false);
    expect(result.errors.betAmount).toBeDefined();
  });

  it('accepts autobet percent above 100 when mode is increase', () => {
    const result = applyFormPatch(
      validForm(),
      { onWinMode: 'increase', onWinPercent: 150 },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(true);
    expect(result.canPlaceManualBet).toBe(true);
    expect(result.canStartAutoBet).toBe(true);
    expect(result.errors.onWinPercent).toBeUndefined();
  });

  it('rejects negative autobet percent when mode is increase', () => {
    const result = applyFormPatch(
      validForm(),
      {
        onWinMode: 'increase',
        onWinPercent: -50,
        onLossMode: 'increase',
        onLossPercent: -25,
      },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(false);
    expect(result.canStartAutoBet).toBe(false);
    expect(result.errors.onWinPercent).toBeDefined();
    expect(result.errors.onLossPercent).toBeDefined();
  });

  it('ignores inactive autobet percent while mode is reset', () => {
    const increaseForm = applyFormPatch(
      validForm(),
      { onWinMode: 'increase', onWinPercent: 150 },
      limits,
      diceOdds,
    );

    const result = applyFormPatch(
      increaseForm.form,
      { onWinMode: 'reset' },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(true);
    expect(result.canStartAutoBet).toBe(true);
    expect(result.errors.onWinPercent).toBeUndefined();
  });

  it('rejects non-integer auto bet count', () => {
    const result = applyFormPatch(
      validForm(),
      { autoBetCount: 1.5 },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.autoBetCount).toBeDefined();
  });

  it('rejects multiplier below minimum before recalculating odds', () => {
    const result = applyFormPatch(
      validForm(),
      { multiplier: 0.5 },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.multiplier).toBeDefined();
    expect(result.form.multiplier).toBe(0.5);
  });

  it('rejects slider value outside rollOver limits', () => {
    const oddsLimits = diceOdds.getLimits('rollOver');
    const result = applyFormPatch(
      validForm(),
      { sliderValue: oddsLimits.sliderValue.min - 1 },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.sliderValue).toBeDefined();
  });

  it('recalculates rollUnder odds before validating a game mode change', () => {
    const rollOverForm = applyFormPatch(
      validForm(),
      { sliderValue: 98 },
      limits,
      diceOdds,
    );

    const result = applyFormPatch(
      rollOverForm.form,
      { gameMode: 'rollUnder' },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(true);
    expect(result.form.gameMode).toBe('rollUnder');
    expect(result.form.sliderValue).toBe(result.form.winChance);
  });

  it('recalculates odds when multiplier changes', () => {
    const result = applyFormPatch(
      validForm(),
      { multiplier: 2 },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(true);
    expect(result.form.multiplier).toBe(2);
    expect(result.form.sliderValue).toBeDefined();
    expect(result.form.winChance).toBeDefined();
  });

  it('updates betMode without recalculating odds', () => {
    const result = applyFormPatch(
      validForm(),
      { betMode: 'auto' },
      limits,
      diceOdds,
    );

    expect(result.isValid).toBe(true);
    expect(result.form.betMode).toBe('auto');
  });
});

describe('hasAutoBetSettingsErrors', () => {
  it('returns false when autobet settings fields have no errors', () => {
    expect(hasAutoBetSettingsErrors({})).toBe(false);
    expect(hasAutoBetSettingsErrors({ betAmount: 'Invalid bet' })).toBe(false);
  });

  it('returns true when any autobet settings field has an error', () => {
    expect(hasAutoBetSettingsErrors({ onWinPercent: 'Invalid percent' })).toBe(
      true,
    );
    expect(hasAutoBetSettingsErrors({ stopOnProfit: 'Invalid value' })).toBe(
      true,
    );
  });
});

describe('getDiceBetActions', () => {
  it('enables manual bet when form is valid and connected', () => {
    const actions = getDiceBetActions(validForm(), limits, true, diceOdds);

    expect(actions.canPlaceManualBet).toBe(true);
    expect(actions.canStartAutoBet).toBe(true);
  });

  it('disables all bet actions when disconnected', () => {
    const actions = getDiceBetActions(validForm(), limits, false, diceOdds);

    expect(actions.canPlaceManualBet).toBe(false);
    expect(actions.canStartAutoBet).toBe(false);
  });

  it('disables manual bet when form is invalid even if connected', () => {
    const form = applyFormPatch(
      validForm(),
      { betAmount: 0.5 },
      limits,
      diceOdds,
    ).form;
    const actions = getDiceBetActions(form, limits, true, diceOdds);

    expect(actions.canPlaceManualBet).toBe(false);
    expect(actions.canStartAutoBet).toBe(false);
  });
});
