export const MIN_PLINKO_ROWS = 8;
export const MAX_PLINKO_ROWS = 16;
export const DEFAULT_PLINKO_ROWS = 12;

export const PLINKO_RISKS = ['easy', 'medium', 'hard', 'expert'] as const;

export type PlinkoRisk = (typeof PLINKO_RISKS)[number];

export const DEFAULT_PLINKO_RISK: PlinkoRisk = 'medium';

export const PLINKO_MULTIPLIER_DECIMALS = 2;

export const isPlinkoRisk = (value: string): value is PlinkoRisk =>
  (PLINKO_RISKS as readonly string[]).includes(value);

export const isPlinkoRows = (rows: number): boolean =>
  Number.isInteger(rows) && rows >= MIN_PLINKO_ROWS && rows <= MAX_PLINKO_ROWS;
