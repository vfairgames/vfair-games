import type { GameId } from './games';
import type { BetResult } from './bet';

export type GetBetHistoryRequest = {
  gameId?: GameId;
  limit?: number;
  cursor?: string;
};

export type GetBetHistoryResponse = {
  items: BetResult[];
  nextCursor?: string;
};
