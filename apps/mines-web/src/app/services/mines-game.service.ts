import { nanoid } from 'nanoid';

import {
  calculateProfitOnWin,
  generateMineLayout,
  isMineHit,
  MINES_GRID_SIZE,
  MINES_MULTIPLIER_DECIMALS,
  type MinesOdds,
} from '@vfair/game-math';
import {
  MINES_GAME_ID,
  WS_MINES_CASH_OUT,
  WS_MINES_GET_ACTIVE_ROUND,
  WS_MINES_PLACE_AUTO_ROUND,
  WS_MINES_PLACE_BET,
  WS_MINES_REVEAL_TILE,
  WS_SESSION_GET_BET_HISTORY,
  type FairnessSnapshot,
  type GetBetHistoryRequest,
  type GetBetHistoryResponse,
  type MinesBetResult,
  type MinesGetActiveRoundResponse,
  type MinesPlaceAutoRoundRequest,
  type MinesPlaceBetRequest,
  type MinesRevealEntry,
  type MinesRevealTileRequest,
} from '@vfair/game-contracts';
import {
  fairnessService,
  socketService,
  toastService,
  translate,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import type { MinesForm } from '../store/mines-form';
import {
  useMinesGameStore,
  type MinesActiveRound,
} from '../store/mines-game-store';

type MinesGameServiceInterface = {
  placeBet(form: MinesForm): Promise<void>;
  revealTile(tile: number): Promise<MinesBetResult | null>;
  getRandomUnrevealedTile(): number | null;
  cashOut(): Promise<MinesBetResult>;
  placeAutoRound(
    form: MinesForm,
    selectedTiles: readonly number[],
  ): Promise<MinesBetResult>;
  loadHistory(cursor?: string): Promise<GetBetHistoryResponse>;
  restoreActiveRound(): Promise<void>;
};

class MinesGameDemoService implements MinesGameServiceInterface {
  static readonly #MAX_BET_HISTORY = 30;
  static readonly #RESPONSE_DELAY_MS = 500;

  #betHistory: MinesBetResult[] = [];

  placeBet(form: MinesForm): Promise<void> {
    const round = this.#startRound(form);
    useMinesGameStore.getState().setActiveRound(round);
    this.#upsertBetResult(this.#toActiveBetResult(round));
    return Promise.resolve();
  }

  async revealTile(tile: number): Promise<MinesBetResult | null> {
    await this.#wait(
      this.#getDelayMs(Math.random() * MinesGameDemoService.#RESPONSE_DELAY_MS),
    );

    const store = useMinesGameStore.getState();
    const round = this.#getActiveRound();

    if (round.reveals.some((entry) => entry.tile === tile)) {
      return null;
    }

    const reveal = this.#createRevealEntry(
      tile,
      round.reveals.length + 1,
      round.mineCount,
      store.minesOdds,
    );
    const reveals = [...round.reveals, reveal];
    const nextRound = { ...round, reveals };

    if (isMineHit(tile, round.mineLayout)) {
      return this.#settleRound(nextRound, 'lost', 0);
    }

    const hitsMaxWin =
      this.#getProfitOnWin(round.betAmount, reveal.multiplier) >
      useMainStore.getState().maxWin;
    const isFullClear =
      reveals.length >= store.minesOdds.getGemCount(round.mineCount);

    if (hitsMaxWin || isFullClear) {
      return this.#settleRound(nextRound, 'won', reveal.multiplier);
    }

    store.updateActiveReveals(reveals);
    this.#upsertBetResult(this.#toActiveBetResult(nextRound));

    return null;
  }

  getRandomUnrevealedTile(): number | null {
    const round = this.#getActiveRound();
    const revealed = new Set(round.reveals.map((entry) => entry.tile));
    const unrevealed = Array.from(
      { length: MINES_GRID_SIZE },
      (_, index) => index,
    ).filter((tile) => !revealed.has(tile));

    if (unrevealed.length === 0) {
      return null;
    }

    return unrevealed[Math.floor(Math.random() * unrevealed.length)] ?? null;
  }

  async cashOut(): Promise<MinesBetResult> {
    const round = this.#getActiveRound();

    if (round.reveals.length === 0) {
      throw new Error(translate('minesCashOutRequiresReveal'));
    }

    await this.#wait(this.#getDelayMs(MinesGameDemoService.#RESPONSE_DELAY_MS));

    return this.#settleRound(
      round,
      'won',
      round.reveals[round.reveals.length - 1]?.multiplier ?? 1,
    );
  }

  placeAutoRound(
    form: MinesForm,
    selectedTiles: readonly number[],
  ): Promise<MinesBetResult> {
    if (selectedTiles.length === 0) {
      throw new Error(translate('minesSelectTilesToAutoBet'));
    }

    const { roundToCurrency } = useMainStore.getState();
    const minesOdds = useMinesGameStore.getState().minesOdds;
    this.#assertProfitWithinMaxWin(
      roundToCurrency(form.betAmount),
      minesOdds.getMultiplier(form.mineCount, selectedTiles.length),
    );

    const round = this.#startRound(form);
    const reveals = this.#createRevealsFromTiles(
      selectedTiles,
      form.mineCount,
      minesOdds,
      round.mineLayout,
    );
    const settledRound = { ...round, reveals };
    const lastReveal = reveals[reveals.length - 1];
    const hitMine =
      lastReveal !== undefined && isMineHit(lastReveal.tile, round.mineLayout);

    return Promise.resolve(
      hitMine
        ? this.#settleRound(settledRound, 'lost', 0)
        : this.#settleRound(settledRound, 'won', lastReveal?.multiplier ?? 1),
    );
  }

  loadHistory(): Promise<GetBetHistoryResponse> {
    return Promise.resolve({ items: [...this.#betHistory].reverse() });
  }

  restoreActiveRound(): Promise<void> {
    return Promise.resolve();
  }

  #wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  #getDelayMs(maxMs: number): number {
    if (useMinesGameStore.getState().betResultTransitionMs === 0) {
      return 0;
    }

    return maxMs;
  }

  #upsertBetResult(result: MinesBetResult): void {
    const existingIndex = this.#betHistory.findIndex(
      (item) => item.id === result.id,
    );

    if (existingIndex >= 0) {
      this.#betHistory[existingIndex] = result;
    } else {
      this.#betHistory.push(result);
    }

    if (this.#betHistory.length > MinesGameDemoService.#MAX_BET_HISTORY) {
      this.#betHistory.shift();
    }
  }

  #toActiveBetResult(round: MinesActiveRound): MinesBetResult {
    const { balance } = useMainStore.getState();

    return {
      id: round.id,
      gameId: MINES_GAME_ID,
      status: 'active',
      balance,
      betAmount: round.betAmount,
      cashOut: 0,
      createdAt: round.createdAt,
      currency: this.#getBetCurrency(),
      fairness: round.fairness,
      gameData: {
        mineCount: round.mineCount,
        gridSize: MINES_GRID_SIZE,
        reveals: round.reveals,
        multiplier: round.reveals.at(-1)?.multiplier ?? 1,
      },
    };
  }

  #getBetCurrency(): MinesBetResult['currency'] {
    const { currency, currencyDecimals } = useMainStore.getState();

    return {
      code: currency,
      decimals: currencyDecimals,
    };
  }

  #getProfitOnWin(betAmount: number, multiplier: number): number {
    const { currencyDecimals } = useMainStore.getState();

    return calculateProfitOnWin(
      betAmount,
      multiplier,
      currencyDecimals,
      MINES_MULTIPLIER_DECIMALS,
    );
  }

  #getCashOutAmount(betAmount: number, multiplier: number): number {
    const { roundToCurrency, maxWin } = useMainStore.getState();
    const profit = Math.min(
      this.#getProfitOnWin(betAmount, multiplier),
      maxWin,
    );

    return roundToCurrency(betAmount + profit);
  }

  #assertProfitWithinMaxWin(betAmount: number, multiplier: number): void {
    const { maxWin } = useMainStore.getState();

    if (this.#getProfitOnWin(betAmount, multiplier) > maxWin) {
      throw new Error(
        translate('minesValidationProfitExceedsMaxWin', { maxWin }),
      );
    }
  }

  #buildFairnessSnapshot(): FairnessSnapshot {
    const { clientSeed, nonce, serverSeedHash } = useFairnessStore.getState();

    return {
      serverSeedHash,
      serverSeed: fairnessService.getDemoServerSeed(),
      clientSeed,
      nonce,
    };
  }

  #debitBetAmount(betAmount: number): void {
    const { balance, roundToCurrency } = useMainStore.getState();
    useMainStore.getState().setBalance(roundToCurrency(balance - betAmount));
  }

  #getActiveRound(): MinesActiveRound {
    const { activeRound, roundStatus } = useMinesGameStore.getState();

    if (!activeRound || roundStatus !== 'active') {
      throw new Error(translate('minesNoActiveRound'));
    }

    return activeRound;
  }

  #createRevealEntry(
    tile: number,
    order: number,
    mineCount: number,
    minesOdds: MinesOdds,
  ): MinesRevealEntry {
    return {
      tile,
      order,
      multiplier: minesOdds.getMultiplier(mineCount, order),
    };
  }

  #createRevealsFromTiles(
    tiles: readonly number[],
    mineCount: number,
    minesOdds: MinesOdds,
    mineLayout: readonly number[],
  ): MinesRevealEntry[] {
    const reveals: MinesRevealEntry[] = [];

    for (const tile of tiles) {
      reveals.push(
        this.#createRevealEntry(tile, reveals.length + 1, mineCount, minesOdds),
      );

      if (isMineHit(tile, mineLayout)) {
        break;
      }
    }

    return reveals;
  }

  #startRound(form: MinesForm): MinesActiveRound {
    const { roundToCurrency } = useMainStore.getState();
    const betAmount = roundToCurrency(form.betAmount);
    const fairness = this.#buildFairnessSnapshot();
    const mineLayout = generateMineLayout(
      fairness.serverSeed ?? '',
      fairness.clientSeed,
      fairness.nonce,
      form.mineCount,
    );

    useFairnessStore.getState().setNonce(fairness.nonce + 1);
    this.#debitBetAmount(betAmount);

    return {
      id: nanoid(),
      betAmount,
      mineCount: form.mineCount,
      mineLayout,
      reveals: [],
      createdAt: Date.now(),
      fairness,
    };
  }

  #settleRound(
    round: MinesActiveRound,
    status: 'won' | 'lost',
    multiplier: number,
  ): MinesBetResult {
    const { balance, roundToCurrency } = useMainStore.getState();
    const cashOut =
      status === 'won'
        ? this.#getCashOutAmount(round.betAmount, multiplier)
        : 0;
    const nextBalance =
      status === 'won'
        ? roundToCurrency(balance + cashOut)
        : roundToCurrency(balance);

    const result: MinesBetResult = {
      id: round.id,
      gameId: MINES_GAME_ID,
      status,
      balance: nextBalance,
      betAmount: round.betAmount,
      cashOut,
      createdAt: round.createdAt,
      currency: this.#getBetCurrency(),
      fairness: round.fairness,
      gameData: {
        mineCount: round.mineCount,
        gridSize: MINES_GRID_SIZE,
        mineLayout: round.mineLayout,
        reveals: round.reveals,
        multiplier: status === 'won' ? multiplier : 0,
      },
    };

    this.#upsertBetResult(result);
    useMinesGameStore.getState().settleRound(
      round.mineLayout,
      round.reveals.map((entry) => entry.tile),
    );

    return result;
  }
}

class MinesGameLiveService implements MinesGameServiceInterface {
  async placeBet(form: MinesForm): Promise<void> {
    const { roundToCurrency } = useMainStore.getState();
    const request: MinesPlaceBetRequest = {
      requestId: nanoid(),
      betAmount: roundToCurrency(form.betAmount),
      currency: this.#getBetCurrency(),
      gameData: {
        mineCount: form.mineCount,
        gridSize: MINES_GRID_SIZE,
      },
    };

    const result = await socketService.emit<
      MinesBetResult,
      MinesPlaceBetRequest
    >(WS_MINES_PLACE_BET, request);

    this.#applyActiveResult(result);
    useFairnessStore.getState().setNonce(result.fairness.nonce + 1);
  }

  async revealTile(tile: number): Promise<MinesBetResult | null> {
    const result = await socketService.emit<
      MinesBetResult,
      MinesRevealTileRequest
    >(WS_MINES_REVEAL_TILE, { tile });

    useMainStore.getState().setBalance(result.balance);

    if (result.status === 'active') {
      useMinesGameStore.getState().updateActiveReveals(result.gameData.reveals);
      return null;
    }

    this.#applySettledResult(result);
    return result;
  }

  getRandomUnrevealedTile(): number | null {
    const { activeRound, roundStatus } = useMinesGameStore.getState();

    if (!activeRound || roundStatus !== 'active') {
      return null;
    }

    const revealed = new Set(activeRound.reveals.map((entry) => entry.tile));
    const unrevealed = Array.from(
      { length: MINES_GRID_SIZE },
      (_, index) => index,
    ).filter((tile) => !revealed.has(tile));

    if (unrevealed.length === 0) {
      return null;
    }

    return unrevealed[Math.floor(Math.random() * unrevealed.length)] ?? null;
  }

  async cashOut(): Promise<MinesBetResult> {
    const result = await socketService.emit<MinesBetResult>(WS_MINES_CASH_OUT);
    this.#applySettledResult(result);
    return result;
  }

  async placeAutoRound(
    form: MinesForm,
    selectedTiles: readonly number[],
  ): Promise<MinesBetResult> {
    if (selectedTiles.length === 0) {
      throw new Error(translate('minesSelectTilesToAutoBet'));
    }

    const { roundToCurrency } = useMainStore.getState();
    const request: MinesPlaceAutoRoundRequest = {
      requestId: nanoid(),
      betAmount: roundToCurrency(form.betAmount),
      currency: this.#getBetCurrency(),
      gameData: {
        mineCount: form.mineCount,
        gridSize: MINES_GRID_SIZE,
      },
      selectedTiles: [...selectedTiles],
    };

    const result = await socketService.emit<
      MinesBetResult,
      MinesPlaceAutoRoundRequest
    >(WS_MINES_PLACE_AUTO_ROUND, request);

    useFairnessStore.getState().setNonce(result.fairness.nonce + 1);
    this.#applySettledResult(result);
    return result;
  }

  async loadHistory(cursor?: string): Promise<GetBetHistoryResponse> {
    const request: GetBetHistoryRequest = {
      gameId: MINES_GAME_ID,
      ...(cursor ? { cursor } : {}),
    };
    const response = await socketService.emit<
      GetBetHistoryResponse,
      GetBetHistoryRequest
    >(WS_SESSION_GET_BET_HISTORY, request);

    return {
      items: response.items.filter(
        (item): item is MinesBetResult => item.gameId === MINES_GAME_ID,
      ),
      ...(response.nextCursor ? { nextCursor: response.nextCursor } : {}),
    };
  }

  async restoreActiveRound(): Promise<void> {
    const { round } = await socketService.emit<MinesGetActiveRoundResponse>(
      WS_MINES_GET_ACTIVE_ROUND,
    );

    if (!round || round.status !== 'active') {
      return;
    }

    const { currency, currencyDecimals } = useMainStore.getState();
    if (
      round.currency.code !== currency ||
      round.currency.decimals !== currencyDecimals
    ) {
      toastService.error(translate('minesActiveRoundCurrencyMismatch'), {
        description: translate('minesActiveRoundCurrencyMismatchDescription', {
          currency: round.currency.code,
        }),
      });
      return;
    }

    this.#applyActiveResult(round);
    useFairnessStore.getState().setNonce(round.fairness.nonce + 1);
  }

  #getBetCurrency(): MinesBetResult['currency'] {
    const { currency, currencyDecimals } = useMainStore.getState();

    return {
      code: currency,
      decimals: currencyDecimals,
    };
  }

  #applyActiveResult(result: MinesBetResult): void {
    useMainStore.getState().setBalance(result.balance);
    useMinesGameStore.getState().patchForm({
      betAmount: result.betAmount,
      mineCount: result.gameData.mineCount,
    });
    useMinesGameStore.getState().setActiveRound({
      id: result.id,
      betAmount: result.betAmount,
      mineCount: result.gameData.mineCount,
      mineLayout: [],
      reveals: result.gameData.reveals,
      createdAt: result.createdAt,
      fairness: result.fairness,
    });
  }

  #applySettledResult(result: MinesBetResult): void {
    useMainStore.getState().setBalance(result.balance);
    useMinesGameStore.getState().settleRound(
      result.gameData.mineLayout ?? [],
      result.gameData.reveals.map((entry) => entry.tile),
    );
  }
}

class MinesGameService implements MinesGameServiceInterface {
  #demoService = new MinesGameDemoService();
  #liveService = new MinesGameLiveService();

  #activeService(): MinesGameServiceInterface {
    return useMainStore.getState().isDemo
      ? this.#demoService
      : this.#liveService;
  }

  placeBet(form: MinesForm): Promise<void> {
    return this.#activeService().placeBet(form);
  }

  revealTile(tile: number): Promise<MinesBetResult | null> {
    return this.#activeService().revealTile(tile);
  }

  getRandomUnrevealedTile(): number | null {
    return this.#activeService().getRandomUnrevealedTile();
  }

  cashOut(): Promise<MinesBetResult> {
    return this.#activeService().cashOut();
  }

  placeAutoRound(
    form: MinesForm,
    selectedTiles: readonly number[],
  ): Promise<MinesBetResult> {
    return this.#activeService().placeAutoRound(form, selectedTiles);
  }

  loadHistory(cursor?: string): Promise<GetBetHistoryResponse> {
    return this.#activeService().loadHistory(cursor);
  }

  restoreActiveRound(): Promise<void> {
    return this.#activeService().restoreActiveRound();
  }
}

export const minesGameService = new MinesGameService();
