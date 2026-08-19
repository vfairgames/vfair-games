import { DICE_GAME_MODES, type DiceGameMode } from '@vfair/game-contracts';
import {
  calculateProfitOnWin,
  type DiceOdds,
  type DiceOddsInput,
} from '@vfair/game-math';
import { z } from 'zod';

import {
  AUTO_BET_ADJUSTMENT_MODES,
  BET_MODES,
  translate,
  type AutoBetAdjustmentMode,
  type BetMode,
} from '@vfair/games-web-shell';

const initialBetFields = {
  betAmount: 0,
  autoBetCount: 0,
  betMode: 'manual' as BetMode,
  onWinMode: 'reset' as AutoBetAdjustmentMode,
  onWinPercent: 0,
  onLossMode: 'reset' as AutoBetAdjustmentMode,
  onLossPercent: 0,
  stopOnLoss: 0,
  stopOnProfit: 0,
};

export type DiceForm = typeof initialBetFields & {
  gameMode: DiceGameMode;
  multiplier: number;
  sliderValue: number;
  winChance: number;
};

const AUTO_BET_SETTINGS_FIELDS = [
  'onWinMode',
  'onWinPercent',
  'onLossMode',
  'onLossPercent',
  'stopOnLoss',
  'stopOnProfit',
] as const satisfies readonly (keyof DiceForm)[];

export const hasAutoBetSettingsErrors = (
  errors: Partial<Record<keyof DiceForm, string>>,
): boolean =>
  AUTO_BET_SETTINGS_FIELDS.some((field) => errors[field] !== undefined);

type DiceFormLimits = {
  minBet: number;
  maxBet: number;
  maxWin: number;
  currencyDecimals: number;
};

type ValidationIssue = {
  path: readonly unknown[];
  message: string;
};

type DiceFormValidation = {
  form: DiceForm;
  errors: Partial<Record<keyof DiceForm, string>>;
  isValid: boolean;
  canPlaceManualBet: boolean;
  canStartAutoBet: boolean;
};

export const initialDiceForm = (diceOdds: DiceOdds): DiceForm => {
  const gameMode = 'rollOver' as const;

  return {
    ...initialBetFields,
    gameMode,
    ...diceOdds.calculate({ gameMode }),
  };
};

const toFieldErrors = (
  issues: readonly ValidationIssue[],
): Partial<Record<keyof DiceForm, string>> => {
  const errors: Partial<Record<keyof DiceForm, string>> = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) {
      errors[key as keyof DiceForm] = issue.message;
    }
  }

  return errors;
};

const addRangeIssue = (
  ctx: z.RefinementCtx,
  field: 'multiplier' | 'winChance' | 'sliderValue',
  value: number,
  bounds: { min: number; max: number },
  label: string,
): void => {
  if (value < bounds.min || value > bounds.max) {
    ctx.addIssue({
      code: 'custom',
      path: [field],
      message: translate('diceValidationBetween', {
        label,
        min: bounds.min,
        max: bounds.max,
      }),
    });
  }
};

const baseDiceFormShape = (limits: DiceFormLimits) => ({
  betAmount: z
    .number()
    .min(
      limits.minBet,
      translate('diceValidationBetAmountMin', { min: limits.minBet }),
    )
    .max(
      limits.maxBet,
      translate('diceValidationBetAmountMax', { max: limits.maxBet }),
    ),
  betMode: z.enum(BET_MODES),
  gameMode: z.enum(DICE_GAME_MODES),
  multiplier: z.number(),
  sliderValue: z.number(),
  winChance: z.number(),
});

const autoBetFormShape = () => ({
  autoBetCount: z
    .number()
    .int(translate('diceValidationAutoBetCountInteger'))
    .min(0),
  onWinMode: z.enum(AUTO_BET_ADJUSTMENT_MODES),
  onWinPercent: z.number(),
  onLossMode: z.enum(AUTO_BET_ADJUSTMENT_MODES),
  onLossPercent: z.number(),
  stopOnLoss: z.number().min(0),
  stopOnProfit: z.number().min(0),
});

const addAutobetPercentIssues = (
  data: Pick<
    DiceForm,
    'onWinMode' | 'onWinPercent' | 'onLossMode' | 'onLossPercent'
  >,
  ctx: z.RefinementCtx,
): void => {
  if (data.onWinMode === 'increase' && data.onWinPercent < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['onWinPercent'],
      message: translate('diceValidationOnWinPercentMin'),
    });
  }

  if (data.onLossMode === 'increase' && data.onLossPercent < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['onLossPercent'],
      message: translate('diceValidationOnLossPercentMin'),
    });
  }
};

const addMaxWinIssue = (
  data: Pick<DiceForm, 'betAmount' | 'multiplier'>,
  limits: DiceFormLimits,
  ctx: z.RefinementCtx,
): void => {
  const profitOnWin = calculateProfitOnWin(
    data.betAmount,
    data.multiplier,
    limits.currencyDecimals,
  );

  if (profitOnWin > limits.maxWin) {
    ctx.addIssue({
      code: 'custom',
      path: ['betAmount'],
      message: translate('diceValidationProfitExceedsMaxWin', {
        maxWin: limits.maxWin,
      }),
    });
  }
};

const createAddDiceOddsIssues =
  (diceOdds: DiceOdds) =>
  (
    data: Pick<
      DiceForm,
      'gameMode' | 'multiplier' | 'winChance' | 'sliderValue'
    >,
    ctx: z.RefinementCtx,
  ): void => {
    const oddsLimits = diceOdds.getLimits(data.gameMode);

    (
      [
        [
          'multiplier',
          translate('diceValidationMultiplier'),
          oddsLimits.multiplier,
        ],
        [
          'winChance',
          translate('diceValidationWinChance'),
          oddsLimits.winChance,
        ],
        [
          'sliderValue',
          translate('diceValidationSliderValue'),
          oddsLimits.sliderValue,
        ],
      ] as const
    ).forEach(([field, label, bounds]) => {
      addRangeIssue(ctx, field, data[field], bounds, label);
    });
  };

const addCommonFormIssues = (
  data: Pick<
    DiceForm,
    'betAmount' | 'multiplier' | 'gameMode' | 'winChance' | 'sliderValue'
  >,
  limits: DiceFormLimits,
  diceOdds: DiceOdds,
  ctx: z.RefinementCtx,
): void => {
  createAddDiceOddsIssues(diceOdds)(data, ctx);
  addMaxWinIssue(data, limits, ctx);
};

const createManualDiceFormSchema = (
  limits: DiceFormLimits,
  diceOdds: DiceOdds,
) =>
  z
    .object(baseDiceFormShape(limits))
    .superRefine((data, ctx) =>
      addCommonFormIssues(data, limits, diceOdds, ctx),
    );

const createAutoDiceFormSchema = (limits: DiceFormLimits, diceOdds: DiceOdds) =>
  z
    .object({
      ...baseDiceFormShape(limits),
      ...autoBetFormShape(),
    })
    .superRefine((data, ctx) => {
      addCommonFormIssues(data, limits, diceOdds, ctx);
      addAutobetPercentIssues(data, ctx);
    });

const withRecalculatedOdds = (
  form: DiceForm,
  patch: Partial<DiceForm>,
  diceOdds: DiceOdds,
): DiceForm => {
  const gameMode = patch.gameMode ?? form.gameMode;
  let oddsInput: DiceOddsInput | undefined;

  if ('multiplier' in patch) {
    oddsInput = { multiplier: patch.multiplier, gameMode };
  } else if ('sliderValue' in patch) {
    oddsInput = { sliderValue: patch.sliderValue, gameMode };
  } else if ('winChance' in patch) {
    oddsInput = { winChance: patch.winChance, gameMode };
  } else if ('gameMode' in patch) {
    oddsInput = { winChance: form.winChance, gameMode };
  }

  if (!oddsInput) {
    return form;
  }

  try {
    return { ...form, ...diceOdds.calculate(oddsInput) };
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    return form;
  }
};

export const applyFormPatch = (
  current: DiceForm,
  patch: Partial<DiceForm>,
  limits: DiceFormLimits,
  diceOdds: DiceOdds,
): DiceFormValidation => {
  const merged = { ...current, ...patch };
  const form = withRecalculatedOdds(merged, patch, diceOdds);
  const manualParsed = createManualDiceFormSchema(limits, diceOdds).safeParse(
    form,
  );
  const autoParsed = createAutoDiceFormSchema(limits, diceOdds).safeParse(form);
  const errors = {
    ...(!manualParsed.success ? toFieldErrors(manualParsed.error.issues) : {}),
    ...(!autoParsed.success ? toFieldErrors(autoParsed.error.issues) : {}),
  };

  if (!manualParsed.success) {
    return {
      form,
      errors,
      isValid: false,
      canPlaceManualBet: false,
      canStartAutoBet: false,
    };
  }

  return {
    form,
    errors,
    isValid: autoParsed.success,
    canPlaceManualBet: true,
    canStartAutoBet: autoParsed.success,
  };
};

export const getDiceBetActions = (
  form: DiceForm,
  limits: DiceFormLimits,
  isConnected: boolean,
  diceOdds: DiceOdds,
): Pick<DiceFormValidation, 'canPlaceManualBet' | 'canStartAutoBet'> => {
  const validation = applyFormPatch(form, {}, limits, diceOdds);

  if (!isConnected) {
    return { canPlaceManualBet: false, canStartAutoBet: false };
  }

  return {
    canPlaceManualBet: validation.canPlaceManualBet,
    canStartAutoBet: validation.canStartAutoBet,
  };
};
