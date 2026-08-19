export const GAME_ROUND_SETTLED_EVENT = 'game.round.settled' as const;

export type GameRoundSettledStatus = 'WON' | 'LOST';

export type GameRoundSettledEvent = {
  event: typeof GAME_ROUND_SETTLED_EVENT;
  roundId: string;
  playerId: number;
  partnerId: number;
  gameId: string;
  currency: string;
  betAmount: string;
  winAmount: string;
  status: GameRoundSettledStatus;
  settledAt: string;
};

export const GAME_EVENTS_EXCHANGE = 'game.events' as const;
export const GAME_ROUND_SETTLED_ROUTING_KEY = 'game.round.settled' as const;
export const KPI_ROUND_SETTLED_QUEUE = 'kpi.round.settled' as const;
