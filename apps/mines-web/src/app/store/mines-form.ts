import {
  calculateProfitOnWin,
  MINES_MULTIPLIER_DECIMALS,
  type MinesOdds,
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

export type MinesForm = typeof initialBetFields & {
  mineCount: number;
};

const AUTO_BET_SETTINGS_FIELDS = [
  'onWinMode',
  'onWinPercent',
  'onLossMode',
  'onLossPercent',
  'stopOnLoss',
  'stopOnProfit',
] as const satisfies readonly (keyof MinesForm)[];

export const hasAutoBetSettingsErrors = (
  errors: Partial<Record<keyof MinesForm, string>>,
): boolean =>
  AUTO_BET_SETTINGS_FIELDS.some((field) => errors[field] !== undefined);

type MinesFormLimits = {
  minBet: number;
  maxBet: number;
  maxWin: number;
  currencyDecimals: number;
};

type ValidationIssue = {
  path: readonly unknown[];
  message: string;
};

type MinesFormValidation = {
  form: MinesForm;
  errors: Partial<Record<keyof MinesForm, string>>;
  isValid: boolean;
  canPlaceManualBet: boolean;
  canStartAutoBet: boolean;
};

export const initialMinesForm = (minesOdds: MinesOdds): MinesForm => ({
  ...initialBetFields,
  mineCount: minesOdds.getDefaultMineCount(),
});

const toFieldErrors = (
  issues: readonly ValidationIssue[],
): Partial<Record<keyof MinesForm, string>> => {
  const errors: Partial<Record<keyof MinesForm, string>> = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) {
      errors[key as keyof MinesForm] = issue.message;
    }
  }

  return errors;
};

const baseMinesFormShape = (limits: MinesFormLimits) => ({
  betAmount: z
    .number()
    .min(
      limits.minBet,
      translate('minesValidationBetAmountMin', { min: limits.minBet }),
    )
    .max(
      limits.maxBet,
      translate('minesValidationBetAmountMax', { max: limits.maxBet }),
    ),
  betMode: z.enum(BET_MODES),
  mineCount: z.number().int(),
});

const autoBetFormShape = () => ({
  autoBetCount: z
    .number()
    .int(translate('minesValidationAutoBetCountInteger'))
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
    MinesForm,
    'onWinMode' | 'onWinPercent' | 'onLossMode' | 'onLossPercent'
  >,
  ctx: z.RefinementCtx,
): void => {
  if (data.onWinMode === 'increase' && data.onWinPercent < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['onWinPercent'],
      message: translate('minesValidationOnWinPercentMin'),
    });
  }

  if (data.onLossMode === 'increase' && data.onLossPercent < 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['onLossPercent'],
      message: translate('minesValidationOnLossPercentMin'),
    });
  }
};

const addMineCountIssue = (
  mineCount: number,
  minesOdds: MinesOdds,
  ctx: z.RefinementCtx,
): void => {
  const { mineCount: bounds } = minesOdds.getLimits(mineCount);

  if (mineCount < bounds.min || mineCount > bounds.max) {
    ctx.addIssue({
      code: 'custom',
      path: ['mineCount'],
      message: translate('minesValidationBetween', {
        label: translate('minesValidationMineCount'),
        min: bounds.min,
        max: bounds.max,
      }),
    });
  }
};

const addMaxWinIssue = (
  data: Pick<MinesForm, 'betAmount' | 'mineCount'>,
  limits: MinesFormLimits,
  minesOdds: MinesOdds,
  revealCount: number,
  ctx: z.RefinementCtx,
): void => {
  const multiplier = minesOdds.getMultiplier(data.mineCount, revealCount);
  const profitOnWin = calculateProfitOnWin(
    data.betAmount,
    multiplier,
    limits.currencyDecimals,
    MINES_MULTIPLIER_DECIMALS,
  );

  if (profitOnWin > limits.maxWin) {
    ctx.addIssue({
      code: 'custom',
      path: ['betAmount'],
      message: translate('minesValidationProfitExceedsMaxWin', {
        maxWin: limits.maxWin,
      }),
    });
  }
};

const createManualMinesFormSchema = (
  limits: MinesFormLimits,
  minesOdds: MinesOdds,
) =>
  z
    .object(baseMinesFormShape(limits))
    .superRefine((data, ctx) =>
      addMineCountIssue(data.mineCount, minesOdds, ctx),
    );

const createAutoMinesFormSchema = (
  limits: MinesFormLimits,
  minesOdds: MinesOdds,
) =>
  z
    .object({
      ...baseMinesFormShape(limits),
      ...autoBetFormShape(),
    })
    .superRefine((data, ctx) => {
      addMineCountIssue(data.mineCount, minesOdds, ctx);
      addMaxWinIssue(data, limits, minesOdds, 1, ctx);
      addAutobetPercentIssues(data, ctx);
    });

export const applyFormPatch = (
  current: MinesForm,
  patch: Partial<MinesForm>,
  limits: MinesFormLimits,
  minesOdds: MinesOdds,
): MinesFormValidation => {
  const form = { ...current, ...patch };
  const manualParsed = createManualMinesFormSchema(limits, minesOdds).safeParse(
    form,
  );
  const autoParsed = createAutoMinesFormSchema(limits, minesOdds).safeParse(
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

export const getMinesBetActions = (
  form: MinesForm,
  limits: MinesFormLimits,
  isConnected: boolean,
  minesOdds: MinesOdds,
  selectedTileCount: number,
): Pick<MinesFormValidation, 'canPlaceManualBet' | 'canStartAutoBet'> => {
  const validation = applyFormPatch(form, {}, limits, minesOdds);

  if (!isConnected) {
    return { canPlaceManualBet: false, canStartAutoBet: false };
  }

  const gemCount = minesOdds.getGemCount(form.mineCount);
  const hasValidSelection =
    selectedTileCount >= 1 && selectedTileCount <= gemCount;

  if (!validation.canStartAutoBet || !hasValidSelection) {
    return {
      canPlaceManualBet: validation.canPlaceManualBet,
      canStartAutoBet: false,
    };
  }

  const profitOnWin = calculateProfitOnWin(
    form.betAmount,
    minesOdds.getMultiplier(form.mineCount, selectedTileCount),
    limits.currencyDecimals,
    MINES_MULTIPLIER_DECIMALS,
  );

  return {
    canPlaceManualBet: validation.canPlaceManualBet,
    canStartAutoBet: profitOnWin <= limits.maxWin,
  };
};
