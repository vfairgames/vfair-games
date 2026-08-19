import type { GameId } from './games';
import type { FairnessSnapshot } from './fairness';
import type { GameDataByGameId, PlaceBetGameDataByGameId } from './game-data';

export type BetCurrency = {
  code: string;
  decimals: number;
};

export type BetStatus = 'won' | 'lost' | 'active' | 'failed';

export type PlaceBetRequestBase = {
  requestId: string;
  betAmount: number;
  currency: BetCurrency;
};

export type PlaceBetRequest<G extends GameId = GameId> = PlaceBetRequestBase & {
  gameData: PlaceBetGameDataByGameId[G];
};

export type BetResult<G extends GameId = GameId> = {
  id: string;
  gameId: G;
  status: BetStatus;
  betAmount: number;
  cashOut: number;
  balance: number;
  currency: BetCurrency;
  createdAt: number;
  fairness: FairnessSnapshot;
  gameData: GameDataByGameId[G];
};

export type DicePlaceBetRequest = PlaceBetRequest<'v_dice'>;

export type DiceBetResult = BetResult<'v_dice'>;

export type LimboPlaceBetRequest = PlaceBetRequest<'v_limbo'>;

export type LimboBetResult = BetResult<'v_limbo'>;

export type MinesPlaceBetRequest = PlaceBetRequest<'v_mines'>;

export type MinesBetResult = BetResult<'v_mines'>;

export type MinesRevealTileRequest = {
  tile: number;
};

export type MinesCashOutRequest = Record<string, never>;

export type MinesPlaceAutoRoundRequest = MinesPlaceBetRequest & {
  selectedTiles: number[];
};

export type MinesGetActiveRoundResponse = {
  round: MinesBetResult | null;
};

export type PlinkoPlaceBetRequest = PlaceBetRequest<'v_plinko'>;

export type PlinkoBetResult = BetResult<'v_plinko'>;

export type KenoPlaceBetRequest = PlaceBetRequest<'v_keno'>;

export type KenoBetResult = BetResult<'v_keno'>;

export type GetBalanceRequest = {
  currency: string;
};
