import { nanoid } from 'nanoid';

import {
  calculateProfitOnWin,
  isLimboWon,
  LIMBO_MULTIPLIER_DECIMALS,
  rollLimbo,
} from '@vfair/game-math';
import {
  LIMBO_GAME_ID,
  type GetBetHistoryRequest,
  type GetBetHistoryResponse,
  type LimboBetResult,
  type LimboPlaceBetRequest,
  WS_LIMBO_PLACE_BET,
  WS_SESSION_GET_BET_HISTORY,
} from '@vfair/game-contracts';
import {
  fairnessService,
  socketService,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import type { LimboForm } from '../store/limbo-form';

const MAX_DEMO_BET_HISTORY = 30;
const demoBetHistory: LimboBetResult[] = [];

const recordDemoBetResult = (result: LimboBetResult): void => {
  demoBetHistory.push(result);

  if (demoBetHistory.length > MAX_DEMO_BET_HISTORY) {
    demoBetHistory.shift();
  }
};

const getLimboBetCurrency = (): LimboBetResult['currency'] => {
  const { currency, currencyDecimals } = useMainStore.getState();

  return {
    code: currency,
    decimals: currencyDecimals,
  };
};

const simulateDemoBet = (form: LimboForm): LimboBetResult => {
  const { clientSeed, nonce, serverSeedHash } = useFairnessStore.getState();
  const { rtp } = useMainStore.getState();
  const serverSeed = fairnessService.getDemoServerSeed();
  const rolledMultiplier = rollLimbo(serverSeed, clientSeed, nonce, rtp);
  const won = isLimboWon({
    rolledMultiplier,
    targetMultiplier: form.targetMultiplier,
  });

  useFairnessStore.getState().setNonce(nonce + 1);

  const { balance, roundToCurrency, currencyDecimals } =
    useMainStore.getState();
  const currency = getLimboBetCurrency();
  const betAmount = roundToCurrency(form.betAmount);
  const nextBalance = won
    ? roundToCurrency(
        balance +
          calculateProfitOnWin(
            betAmount,
            form.targetMultiplier,
            currencyDecimals,
            LIMBO_MULTIPLIER_DECIMALS,
          ),
      )
    : roundToCurrency(balance - betAmount);

  const cashOut = won
    ? roundToCurrency(
        betAmount +
          calculateProfitOnWin(
            betAmount,
            form.targetMultiplier,
            currencyDecimals,
            LIMBO_MULTIPLIER_DECIMALS,
          ),
      )
    : 0;

  const result: LimboBetResult = {
    id: nanoid(),
    gameId: LIMBO_GAME_ID,
    status: won ? 'won' : 'lost',
    balance: nextBalance,
    betAmount,
    cashOut,
    createdAt: Date.now(),
    currency,
    fairness: {
      serverSeedHash,
      serverSeed,
      clientSeed,
      nonce,
    },
    gameData: {
      rolledMultiplier,
      targetMultiplier: form.targetMultiplier,
      winChance: form.winChance,
      multiplier: won ? form.targetMultiplier : 0,
    },
  };

  recordDemoBetResult(result);

  return result;
};

class LimboGameService {
  placeBet(form: LimboForm): Promise<LimboBetResult> {
    if (useMainStore.getState().isDemo) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(simulateDemoBet(form));
        }, 1);
      });
    }

    const request: LimboPlaceBetRequest = {
      requestId: nanoid(),
      betAmount: form.betAmount,
      currency: getLimboBetCurrency(),
      gameData: {
        targetMultiplier: form.targetMultiplier,
        winChance: form.winChance,
      },
    };

    return socketService.emit<LimboBetResult, LimboPlaceBetRequest>(
      WS_LIMBO_PLACE_BET,
      request,
    );
  }

  async loadHistory(cursor?: string): Promise<GetBetHistoryResponse> {
    if (useMainStore.getState().isDemo) {
      return { items: [...demoBetHistory].reverse() };
    }

    const request: GetBetHistoryRequest = {
      gameId: LIMBO_GAME_ID,
      ...(cursor ? { cursor } : {}),
    };

    return socketService.emit<GetBetHistoryResponse, GetBetHistoryRequest>(
      WS_SESSION_GET_BET_HISTORY,
      request,
    );
  }
}

export const limboGameService = new LimboGameService();
