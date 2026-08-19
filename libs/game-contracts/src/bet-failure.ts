export enum BetFailureStage {
  Debit = 'debit',
  Settle = 'settle',
  Credit = 'credit',
}

export const isBetFailureStage = (value: unknown): value is BetFailureStage =>
  typeof value === 'string' &&
  (Object.values(BetFailureStage) as string[]).includes(value);
