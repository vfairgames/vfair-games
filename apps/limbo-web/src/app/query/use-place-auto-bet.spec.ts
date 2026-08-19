import { LIMBO_GAME_ID, type LimboBetResult } from '@vfair/game-contracts';
import { createLimboOdds, DEFAULT_GAME_RTP } from '@vfair/game-math';
import { DEFAULT_GAME_SETTINGS, useMainStore } from '@vfair/games-web-shell';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { initialLimboForm, type LimboForm } from '../store/limbo-form';
import { useLimboGameStore } from '../store/limbo-game-store';
import { InsufficientBalanceError } from './place-bet-utils';
import {
  AUTO_BET_DELAY_PADDING_MS,
  AUTO_BET_INSTANT_MIN_DELAY_MS,
  runAutoBetSession,
} from './use-place-auto-bet';

const placeBet = vi.fn<(form: LimboForm) => Promise<LimboBetResult>>();

vi.mock('../services/limbo-game.service', () => ({
  limboGameService: {
    placeBet: (form: LimboForm) => placeBet(form),
  },
}));

vi.mock('../services/limbo-sound.service', () => ({
  limboSoundService: {
    playBet: vi.fn(),
    playBetResult: vi.fn(),
  },
}));

const lostResult = (balance: number): LimboBetResult => ({
  id: 'bet-1',
  gameId: LIMBO_GAME_ID,
  status: 'lost',
  balance,
  betAmount: 10,
  cashOut: 0,
  createdAt: Date.now(),
  currency: { code: 'USD', decimals: 2 },
  fairness: {
    serverSeedHash: 'hash',
    serverSeed: null,
    clientSeed: 'client',
    nonce: 0,
  },
  gameData: {
    rolledMultiplier: 1.2,
    targetMultiplier: 2,
    winChance: 49,
    multiplier: 0,
  },
});

const wonResult = (balance: number, id = 'bet-1'): LimboBetResult => ({
  id,
  gameId: LIMBO_GAME_ID,
  status: 'won',
  balance,
  betAmount: 10,
  cashOut: 20,
  createdAt: Date.now(),
  currency: { code: 'USD', decimals: 2 },
  fairness: {
    serverSeedHash: 'hash',
    serverSeed: null,
    clientSeed: 'client',
    nonce: 0,
  },
  gameData: {
    rolledMultiplier: 2.5,
    targetMultiplier: 2,
    winChance: 49,
    multiplier: 2,
  },
});

const limboOdds = createLimboOdds(DEFAULT_GAME_RTP);

const setupSession = (formPatch: Partial<LimboForm> = {}) => {
  useMainStore.getState().applyGameSettings({
    ...DEFAULT_GAME_SETTINGS,
    minBet: 1,
    maxBet: 100,
  });
  useMainStore.getState().initSession({
    playerId: 'user-1',
  });
  useMainStore.getState().setBalance(100);

  useLimboGameStore.setState({
    limboOdds,
    form: {
      ...initialLimboForm(limboOdds),
      betAmount: 10,
      autoBetCount: 1,
      betMode: 'auto',
      onWinMode: 'reset',
      onWinPercent: 0,
      onLossMode: 'reset',
      onLossPercent: 0,
      stopOnLoss: 0,
      stopOnProfit: 0,
      ...formPatch,
    },
    betResults: [],
    betResultTransitionMs: 0,
    errors: {},
  });
};

describe('runAutoBetSession', () => {
  beforeEach(() => {
    placeBet.mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops after stop on profit is reached', async () => {
    setupSession({ stopOnProfit: 5, autoBetCount: 0 });
    placeBet.mockResolvedValueOnce(wonResult(106));

    await runAutoBetSession({ current: false });

    expect(placeBet).toHaveBeenCalledTimes(1);
  });

  it('stops after stop on loss is reached', async () => {
    setupSession({ stopOnLoss: 10, autoBetCount: 0 });
    placeBet.mockResolvedValueOnce(lostResult(90));

    await runAutoBetSession({ current: false });

    expect(placeBet).toHaveBeenCalledTimes(1);
  });

  it('uses adjusted bet amount for the next bet when onLoss mode is increase', async () => {
    setupSession({
      onLossMode: 'increase',
      onLossPercent: 50,
      autoBetCount: 2,
    });
    placeBet
      .mockResolvedValueOnce(lostResult(90))
      .mockResolvedValueOnce(lostResult(75));

    await runAutoBetSession({ current: false });

    expect(placeBet.mock.calls[1]?.[0].betAmount).toBe(15);
    expect(useLimboGameStore.getState().form.betAmount).toBe(10);
  });

  it('uses adjusted bet amount for the next bet when onWin mode is increase', async () => {
    setupSession({
      onWinMode: 'increase',
      onWinPercent: 50,
      autoBetCount: 2,
    });
    placeBet
      .mockResolvedValueOnce(wonResult(110))
      .mockResolvedValueOnce(lostResult(95));

    await runAutoBetSession({ current: false });

    expect(placeBet.mock.calls[1]?.[0].betAmount).toBe(15);
    expect(useLimboGameStore.getState().form.betAmount).toBe(10);
  });

  it('resets bet amount to the session start value when autobet stops', async () => {
    setupSession({
      onLossMode: 'increase',
      onLossPercent: 50,
      autoBetCount: 1,
    });
    placeBet.mockResolvedValueOnce(lostResult(90));

    await runAutoBetSession({ current: false });

    expect(useLimboGameStore.getState().form.betAmount).toBe(10);
  });

  it('resets bet amount to session start on loss when onLoss mode is reset', async () => {
    setupSession({
      onWinMode: 'increase',
      onWinPercent: 50,
      onLossMode: 'reset',
      autoBetCount: 2,
    });
    placeBet
      .mockResolvedValueOnce(wonResult(105))
      .mockResolvedValueOnce(lostResult(95));

    await runAutoBetSession({ current: false });

    expect(useLimboGameStore.getState().form.betAmount).toBe(10);
  });

  it('resets bet amount to session start on win after loss increase', async () => {
    setupSession({
      onLossMode: 'increase',
      onLossPercent: 50,
      onWinMode: 'reset',
      autoBetCount: 2,
    });
    placeBet
      .mockResolvedValueOnce(lostResult(90))
      .mockResolvedValueOnce(wonResult(95, 'bet-2'));

    await runAutoBetSession({ current: false });

    expect(placeBet).toHaveBeenCalledTimes(2);
    expect(useLimboGameStore.getState().form.betAmount).toBe(10);
  });

  it('stops when auto bet count is exhausted', async () => {
    setupSession({ autoBetCount: 2 });
    placeBet
      .mockResolvedValueOnce(lostResult(90))
      .mockResolvedValueOnce(lostResult(80));

    await runAutoBetSession({ current: false });

    expect(placeBet).toHaveBeenCalledTimes(2);
    expect(useLimboGameStore.getState().form.autoBetCount).toBe(0);
  });

  it('waits the instant autobet minimum delay between bets when instant bet is enabled', async () => {
    vi.useFakeTimers();

    setupSession({ autoBetCount: 2 });
    placeBet
      .mockResolvedValueOnce(lostResult(90))
      .mockResolvedValueOnce(lostResult(80));

    const sessionPromise = runAutoBetSession({ current: false });

    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();
    expect(placeBet).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(AUTO_BET_INSTANT_MIN_DELAY_MS);
    await Promise.resolve();
    expect(placeBet).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(AUTO_BET_DELAY_PADDING_MS);
    await sessionPromise;

    expect(placeBet).toHaveBeenCalledTimes(2);
  });

  it('throws InsufficientBalanceError when balance is lower than the next bet', async () => {
    setupSession({
      onLossMode: 'increase',
      onLossPercent: 100,
      autoBetCount: 0,
    });
    useMainStore.getState().setBalance(20);
    placeBet.mockResolvedValueOnce(lostResult(10));

    await expect(runAutoBetSession({ current: false })).rejects.toBeInstanceOf(
      InsufficientBalanceError,
    );

    expect(placeBet).toHaveBeenCalledTimes(1);
    expect(useLimboGameStore.getState().form.betAmount).toBe(10);
  });
});
