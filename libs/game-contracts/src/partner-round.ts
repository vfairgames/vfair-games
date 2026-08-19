import type { BetStatus } from './bet';
import type { FairnessSnapshot } from './fairness';

export type PartnerRoundFairnessResponse = {
  roundId: string;
  gameId: string;
  status: BetStatus;
  fairness: FairnessSnapshot;
  settledAt: number | null;
};
