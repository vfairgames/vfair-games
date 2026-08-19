import {
  calculateProfitOnWin,
  LIMBO_MULTIPLIER_DECIMALS,
  type LimboOdds,
  type LimboOddsInput,
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

export type LimboForm = typeof initialBetFields & {
  targetMultiplier: number;
  winChance: number;
};

const AUTO_BET_SETTINGS_FIELDS = [
  'onWinMode',
  'onWinPercent',
  'onLossMode',
  'onLossPercent',
  'stopOnLoss',
  'stopOnProfit',
] as const satisfies readonly (keyof LimboForm)[];

export const hasAutoBetSettingsErrors = (
  errors: Partial<Record<keyof LimboForm, string>>,
): boolean =>
  AUTO_BET_SETTINGS_FIELDS.some((field) => errors[field] !== undefined);

type LimboFormLimits = {
  minBet: number;
  maxBet: number;
  maxWin: number;
  currencyDecimals: number;
};

type ValidationIssue = {
  path: readonly unknown[];
  message: string;
};

type LimboFormValidation = {
  form: LimboForm;
  errors: Partial<Record<keyof LimboForm, string>>;
  isValid: boolean;
  canPlaceManualBet: boolean;
  canStartAutoBet: boolean;
};

export const initialLimboForm = (limboOdds: LimboOdds): LimboForm => ({
  ...initialBetFields,
  ...limboOdds.calculate(),
});

const toFieldErrors = (
  issues: readonly ValidationIssue[],
): Partial<Record<keyof LimboForm, string>> => {
  const errors: Partial<Record<keyof LimboForm, string>> = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) {
      errors[key as keyof LimboForm] = issue.message;
    }
  }

  return errors;
};

const addRangeIssue = (
  ctx: z.RefinementCtx,
  field: 'targetMultiplier' | 'winChance',
  value: number,
  bounds: { min: number; max: number },
  label: string,
): void => {
  if (value < bounds.min || value > bounds.max) {
    ctx.addIssue({
      code: 'custom',
      path: [field],
      message: translate('limboValidationBetween', {
        label,
        min: bounds.min,
        max: bounds.max,
      }),
    });
  }
};

const baseLimboFormShape = (limits: LimboFormLimits) => ({
  betAmount: z
    .number()
    .min(
      limits.minBet,
      translate('limboValidationBetAmountMin', { min: limits.minBet }),
    )
    .max(
      limits.maxBet,
      translate('limboValidationBetAmountMax', { max: limits.maxBet }),
    ),
  betMode: z.enum(BET_MODES),
  targetMultiplier: z.number(),
  winChance: z.number(),
});

const autoBetFormShape = () => ({
  autoBetCount: z
    .number()
    .int(translate('limboValidationAutoBetCountInteger'))
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
    LimboForm,
    'onWinMode' | 'onWinPercent' | 'onLossMode' | 'onLossPercent'
  >,
  ctx: z.RefinementCtx,
): void => {
  if (data.onWinMode === 'increase' && data.onWinPercent < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['onWinPercent'],
      message: translate('limboValidationOnWinPercentMin'),
    });
  }

  if (data.onLossMode === 'increase' && data.onLossPercent < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['onLossPercent'],
      message: translate('limboValidationOnLossPercentMin'),
    });
  }
};

const addMaxWinIssue = (
  data: Pick<LimboForm, 'betAmount' | 'targetMultiplier'>,
  limits: LimboFormLimits,
  ctx: z.RefinementCtx,
): void => {
  const profitOnWin = calculateProfitOnWin(
    data.betAmount,
    data.targetMultiplier,
    limits.currencyDecimals,
    LIMBO_MULTIPLIER_DECIMALS,
  );

  if (profitOnWin > limits.maxWin) {
    ctx.addIssue({
      code: 'custom',
      path: ['betAmount'],
      message: translate('limboValidationProfitExceedsMaxWin', {
        maxWin: limits.maxWin,
      }),
    });
  }
};

const createAddLimboOddsIssues =
  (limboOdds: LimboOdds) =>
  (
    data: Pick<LimboForm, 'targetMultiplier' | 'winChance'>,
    ctx: z.RefinementCtx,
  ): void => {
    const oddsLimits = limboOdds.getLimits();

    (
      [
        [
          'targetMultiplier',
          translate('limboValidationTargetMultiplier'),
          oddsLimits.targetMultiplier,
        ],
        [
          'winChance',
          translate('limboValidationWinChance'),
          oddsLimits.winChance,
        ],
      ] as const
    ).forEach(([field, label, bounds]) => {
      addRangeIssue(ctx, field, data[field], bounds, label);
    });
  };

const addCommonFormIssues = (
  data: Pick<LimboForm, 'betAmount' | 'targetMultiplier' | 'winChance'>,
  limits: LimboFormLimits,
  limboOdds: LimboOdds,
  ctx: z.RefinementCtx,
): void => {
  createAddLimboOddsIssues(limboOdds)(data, ctx);
  addMaxWinIssue(data, limits, ctx);
};

const createManualLimboFormSchema = (
  limits: LimboFormLimits,
  limboOdds: LimboOdds,
) =>
  z
    .object(baseLimboFormShape(limits))
    .superRefine((data, ctx) =>
      addCommonFormIssues(data, limits, limboOdds, ctx),
    );

const createAutoLimboFormSchema = (
  limits: LimboFormLimits,
  limboOdds: LimboOdds,
) =>
  z
    .object({
      ...baseLimboFormShape(limits),
      ...autoBetFormShape(),
    })
    .superRefine((data, ctx) => {
      addCommonFormIssues(data, limits, limboOdds, ctx);
      addAutobetPercentIssues(data, ctx);
    });

const withRecalculatedOdds = (
  form: LimboForm,
  patch: Partial<LimboForm>,
  limboOdds: LimboOdds,
): LimboForm => {
  let oddsInput: LimboOddsInput | undefined;

  if ('winChance' in patch) {
    oddsInput = { winChance: patch.winChance };
  } else if ('targetMultiplier' in patch) {
    oddsInput = { targetMultiplier: patch.targetMultiplier };
  }

  if (!oddsInput) {
    return form;
  }

  try {
    return { ...form, ...limboOdds.calculate(oddsInput) };
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    return form;
  }
};

export const applyFormPatch = (
  current: LimboForm,
  patch: Partial<LimboForm>,
  limits: LimboFormLimits,
  limboOdds: LimboOdds,
): LimboFormValidation => {
  const merged = { ...current, ...patch };
  const form = withRecalculatedOdds(merged, patch, limboOdds);
  const manualParsed = createManualLimboFormSchema(limits, limboOdds).safeParse(
    form,
  );
  const autoParsed = createAutoLimboFormSchema(limits, limboOdds).safeParse(
    form,
  );
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

export const getLimboBetActions = (
  form: LimboForm,
  limits: LimboFormLimits,
  isConnected: boolean,
  limboOdds: LimboOdds,
): Pick<LimboFormValidation, 'canPlaceManualBet' | 'canStartAutoBet'> => {
  const validation = applyFormPatch(form, {}, limits, limboOdds);

  if (!isConnected) {
    return { canPlaceManualBet: false, canStartAutoBet: false };
  }

  return {
    canPlaceManualBet: validation.canPlaceManualBet,
    canStartAutoBet: validation.canStartAutoBet,
  };
};
