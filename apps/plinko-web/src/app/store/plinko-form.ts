import {
  calculateProfitOnWin,
  DEFAULT_PLINKO_RISK,
  DEFAULT_PLINKO_ROWS,
  PLINKO_MULTIPLIER_DECIMALS,
  PLINKO_RISKS,
  type PlinkoOdds,
  type PlinkoRisk,
} from '@vfair/game-math';
import { z } from 'zod';

import { BET_MODES, translate, type BetMode } from '@vfair/games-web-shell';

const initialBetFields = {
  betAmount: 0,
  autoBetCount: 0,
  betMode: 'manual' as BetMode,
};

export type PlinkoForm = typeof initialBetFields & {
  rows: number;
  risk: PlinkoRisk;
};

type PlinkoFormLimits = {
  minBet: number;
  maxBet: number;
  maxWin: number;
  currencyDecimals: number;
};

type ValidationIssue = {
  path: readonly unknown[];
  message: string;
};

type PlinkoFormValidation = {
  form: PlinkoForm;
  errors: Partial<Record<keyof PlinkoForm, string>>;
  isValid: boolean;
  canPlaceManualBet: boolean;
  canStartAutoBet: boolean;
};

export const initialPlinkoForm = (): PlinkoForm => ({
  ...initialBetFields,
  rows: DEFAULT_PLINKO_ROWS,
  risk: DEFAULT_PLINKO_RISK,
});

const toFieldErrors = (
  issues: readonly ValidationIssue[],
): Partial<Record<keyof PlinkoForm, string>> => {
  const errors: Partial<Record<keyof PlinkoForm, string>> = {};

  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in errors)) {
      errors[key as keyof PlinkoForm] = issue.message;
    }
  }

  return errors;
};

const basePlinkoFormShape = (limits: PlinkoFormLimits) => ({
  betAmount: z
    .number()
    .min(
      limits.minBet,
      translate('plinkoValidationBetAmountMin', { min: limits.minBet }),
    )
    .max(
      limits.maxBet,
      translate('plinkoValidationBetAmountMax', { max: limits.maxBet }),
    ),
  betMode: z.enum(BET_MODES),
  rows: z.number().int(),
  risk: z.enum(PLINKO_RISKS),
});

const autoBetFormShape = () => ({
  autoBetCount: z
    .number()
    .int(translate('plinkoValidationAutoBetCountInteger'))
    .min(0),
});

const addPlinkoOddsIssues = (
  data: Pick<PlinkoForm, 'rows' | 'risk'>,
  plinkoOdds: PlinkoOdds,
  ctx: z.RefinementCtx,
): void => {
  const oddsErrors = plinkoOdds.validate(data);

  if (oddsErrors.rows) {
    ctx.addIssue({
      code: 'custom',
      path: ['rows'],
      message: translate('plinkoValidationBetween', {
        label: translate('plinkoRows'),
        min: plinkoOdds.getLimits().rows.min,
        max: plinkoOdds.getLimits().rows.max,
      }),
    });
  }

  if (oddsErrors.risk) {
    ctx.addIssue({
      code: 'custom',
      path: ['risk'],
      message: oddsErrors.risk,
    });
  }
};

const addMaxWinIssue = (
  data: Pick<PlinkoForm, 'betAmount' | 'rows' | 'risk'>,
  limits: PlinkoFormLimits,
  plinkoOdds: PlinkoOdds,
  ctx: z.RefinementCtx,
): void => {
  const multipliers = plinkoOdds.getMultipliers(data.rows, data.risk);
  const maxMultiplier = Math.max(...multipliers);
  const profitOnWin = calculateProfitOnWin(
    data.betAmount,
    maxMultiplier,
    limits.currencyDecimals,
    PLINKO_MULTIPLIER_DECIMALS,
  );

  if (profitOnWin > limits.maxWin) {
    ctx.addIssue({
      code: 'custom',
      path: ['betAmount'],
      message: translate('plinkoValidationProfitExceedsMaxWin', {
        maxWin: limits.maxWin,
      }),
    });
  }
};

const createManualPlinkoFormSchema = (
  limits: PlinkoFormLimits,
  plinkoOdds: PlinkoOdds,
) =>
  z.object(basePlinkoFormShape(limits)).superRefine((data, ctx) => {
    addPlinkoOddsIssues(data, plinkoOdds, ctx);
    addMaxWinIssue(data, limits, plinkoOdds, ctx);
  });

const createAutoPlinkoFormSchema = (
  limits: PlinkoFormLimits,
  plinkoOdds: PlinkoOdds,
) =>
  z
    .object({
      ...basePlinkoFormShape(limits),
      ...autoBetFormShape(),
    })
    .superRefine((data, ctx) => {
      addPlinkoOddsIssues(data, plinkoOdds, ctx);
      addMaxWinIssue(data, limits, plinkoOdds, ctx);
    });

export const applyFormPatch = (
  current: PlinkoForm,
  patch: Partial<PlinkoForm>,
  limits: PlinkoFormLimits,
  plinkoOdds: PlinkoOdds,
): PlinkoFormValidation => {
  const form = { ...current, ...patch };
  const manualParsed = createManualPlinkoFormSchema(
    limits,
    plinkoOdds,
  ).safeParse(form);
  const autoParsed = createAutoPlinkoFormSchema(limits, plinkoOdds).safeParse(
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

export const getPlinkoBetActions = (
  form: PlinkoForm,
  limits: PlinkoFormLimits,
  isConnected: boolean,
  plinkoOdds: PlinkoOdds,
): Pick<PlinkoFormValidation, 'canPlaceManualBet' | 'canStartAutoBet'> => {
  const validation = applyFormPatch(form, {}, limits, plinkoOdds);

  if (!isConnected) {
    return { canPlaceManualBet: false, canStartAutoBet: false };
  }

  return {
    canPlaceManualBet: validation.canPlaceManualBet,
    canStartAutoBet: validation.canStartAutoBet,
  };
};
