import {
  calculateProfitOnWin,
  DEFAULT_KENO_RISK,
  KENO_MULTIPLIER_DECIMALS,
  KENO_RISKS,
  type KenoOdds,
  type KenoRisk,
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

export type KenoForm = typeof initialBetFields & {
  risk: KenoRisk;
};

const AUTO_BET_SETTINGS_FIELDS = [
  'onWinMode',
  'onWinPercent',
  'onLossMode',
  'onLossPercent',
  'stopOnLoss',
  'stopOnProfit',
] as const satisfies readonly (keyof KenoForm)[];

export const hasAutoBetSettingsErrors = (
  errors: Partial<Record<keyof KenoForm, string>>,
): boolean =>
  AUTO_BET_SETTINGS_FIELDS.some((field) => errors[field] !== undefined);

type KenoFormLimits = {
  minBet: number;
  maxBet: number;
  maxWin: number;
  currencyDecimals: number;
};

type ValidationIssue = {
  path: readonly unknown[];
  message: string;
};

type KenoFormValidation = {
  form: KenoForm;
  errors: Partial<Record<keyof KenoForm, string>>;
  isValid: boolean;
  canPlaceManualBet: boolean;
  canStartAutoBet: boolean;
};

export const initialKenoForm = (): KenoForm => ({
  ...initialBetFields,
  risk: DEFAULT_KENO_RISK,
});

const toFieldErrors = (
  issues: readonly ValidationIssue[],
): Partial<Record<keyof KenoForm, string>> => {
  const errors: Partial<Record<keyof KenoForm, string>> = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) {
      errors[key as keyof KenoForm] = issue.message;
    }
  }

  return errors;
};

const baseKenoFormShape = (limits: KenoFormLimits) => ({
  betAmount: z
    .number()
    .min(
      limits.minBet,
      translate('kenoValidationBetAmountMin', { min: limits.minBet }),
    )
    .max(
      limits.maxBet,
      translate('kenoValidationBetAmountMax', { max: limits.maxBet }),
    ),
  betMode: z.enum(BET_MODES),
  risk: z.enum(KENO_RISKS),
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
    KenoForm,
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

const addKenoOddsIssues = (
  data: Pick<KenoForm, 'risk'>,
  kenoOdds: KenoOdds,
  pickCount: number,
  ctx: z.RefinementCtx,
): void => {
  const oddsErrors = kenoOdds.validate({
    picks: Array.from({ length: pickCount }, (_, index) => index + 1),
    risk: data.risk,
  });

  if (oddsErrors.risk) {
    ctx.addIssue({
      code: 'custom',
      path: ['risk'],
      message: oddsErrors.risk,
    });
  }
};

const addMaxWinIssue = (
  data: Pick<KenoForm, 'betAmount' | 'risk'>,
  limits: KenoFormLimits,
  kenoOdds: KenoOdds,
  pickCount: number,
  ctx: z.RefinementCtx,
): void => {
  if (pickCount === 0) {
    return;
  }

  const paytable = kenoOdds.getPaytable(pickCount, data.risk);
  const maxMultiplier = Math.max(...paytable);
  const profitOnWin = calculateProfitOnWin(
    data.betAmount,
    maxMultiplier,
    limits.currencyDecimals,
    KENO_MULTIPLIER_DECIMALS,
  );

  if (profitOnWin > limits.maxWin) {
    ctx.addIssue({
      code: 'custom',
      path: ['betAmount'],
      message: translate('kenoValidationProfitExceedsMaxWin', {
        maxWin: limits.maxWin,
      }),
    });
  }
};

const createManualKenoFormSchema = (
  limits: KenoFormLimits,
  kenoOdds: KenoOdds,
  pickCount: number,
) =>
  z.object(baseKenoFormShape(limits)).superRefine((data, ctx) => {
    addKenoOddsIssues(data, kenoOdds, pickCount, ctx);
    addMaxWinIssue(data, limits, kenoOdds, pickCount, ctx);
  });

const createAutoKenoFormSchema = (
  limits: KenoFormLimits,
  kenoOdds: KenoOdds,
  pickCount: number,
) =>
  z
    .object({
      ...baseKenoFormShape(limits),
      ...autoBetFormShape(),
    })
    .superRefine((data, ctx) => {
      addKenoOddsIssues(data, kenoOdds, pickCount, ctx);
      addMaxWinIssue(data, limits, kenoOdds, pickCount, ctx);
      addAutobetPercentIssues(data, ctx);
    });

export const applyFormPatch = (
  current: KenoForm,
  patch: Partial<KenoForm>,
  limits: KenoFormLimits,
  kenoOdds: KenoOdds,
  pickCount: number,
): KenoFormValidation => {
  const form = { ...current, ...patch };
  const manualParsed = createManualKenoFormSchema(
    limits,
    kenoOdds,
    pickCount,
  ).safeParse(form);
  const autoParsed = createAutoKenoFormSchema(
    limits,
    kenoOdds,
    pickCount,
  ).safeParse(form);
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

export const getKenoBetActions = (
  form: KenoForm,
  limits: KenoFormLimits,
  isConnected: boolean,
  kenoOdds: KenoOdds,
  selectedPicks: number[],
  canPlaceBet: boolean,
): Pick<KenoFormValidation, 'canPlaceManualBet' | 'canStartAutoBet'> => {
  const pickValidation = kenoOdds.validate({
    picks: selectedPicks,
    risk: form.risk,
  });
  const validation = applyFormPatch(
    form,
    {},
    limits,
    kenoOdds,
    selectedPicks.length,
  );

  if (
    !isConnected ||
    !canPlaceBet ||
    pickValidation.picks !== undefined ||
    selectedPicks.length === 0
  ) {
    return { canPlaceManualBet: false, canStartAutoBet: false };
  }

  return {
    canPlaceManualBet: validation.canPlaceManualBet,
    canStartAutoBet: validation.canStartAutoBet,
  };
};
