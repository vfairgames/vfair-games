import { BetFailureStage, isBetFailureStage } from '@vfair/game-contracts';

const asOutcomeRecord = (outcome: unknown): Record<string, unknown> | null => {
  if (
    typeof outcome !== 'object' ||
    outcome === null ||
    Array.isArray(outcome)
  ) {
    return null;
  }

  return outcome as Record<string, unknown>;
};

export const readFailureStage = (outcome: unknown): BetFailureStage | null => {
  const stage = asOutcomeRecord(outcome)?.['failure_stage'];

  return isBetFailureStage(stage) ? stage : null;
};

export const readErrCode = (outcome: unknown): string | null => {
  const errCode = asOutcomeRecord(outcome)?.['err_code'];

  return typeof errCode === 'string' ? errCode : null;
};
