export const KENO_POOL_SIZE = 40 as const;
export const KENO_DRAW_COUNT = 10 as const;
export const MIN_KENO_PICKS = 1 as const;
export const MAX_KENO_PICKS = 10 as const;
export const KENO_MULTIPLIER_DECIMALS = 2 as const;

export const KENO_RISKS = ['classic', 'low', 'medium', 'high'] as const;

export type KenoRisk = (typeof KENO_RISKS)[number];

export const DEFAULT_KENO_RISK: KenoRisk = 'classic';

export const isKenoRisk = (value: string): value is KenoRisk =>
  (KENO_RISKS as readonly string[]).includes(value);

export const isKenoPickCount = (value: number): boolean =>
  Number.isInteger(value) && value >= MIN_KENO_PICKS && value <= MAX_KENO_PICKS;

export const isKenoPick = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= KENO_POOL_SIZE;
