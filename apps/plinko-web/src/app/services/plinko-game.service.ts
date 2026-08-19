import { nanoid } from 'nanoid';

import {
  calculateProfitOnWin,
  createPlinkoOdds,
  PLINKO_MULTIPLIER_DECIMALS,
  rollPlinko,
} from '@vfair/game-math';
import {
  PLINKO_GAME_ID,
  type GetBetHistoryRequest,
  type GetBetHistoryResponse,
  type PlinkoBetResult,
  type PlinkoPlaceBetRequest,
  WS_PLINKO_PLACE_BET,
  WS_SESSION_GET_BET_HISTORY,
} from '@vfair/game-contracts';
import {
  fairnessService,
  socketService,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import type { PlinkoForm } from '../store/plinko-form';

const MAX_DEMO_BET_HISTORY = 30;
const demoBetHistory: PlinkoBetResult[] = [];
const pendingDemoBetResults = new Map<string, PlinkoBetResult>();

const recordDemoBetResult = (result: PlinkoBetResult): void => {
  demoBetHistory.push(result);

  if (demoBetHistory.length > MAX_DEMO_BET_HISTORY) {
    demoBetHistory.shift();
  }
};

export const commitDemoBetResult = (resultId: string): void => {
  const result = pendingDemoBetResults.get(resultId);

  if (!result) {
    return;
  }

  pendingDemoBetResults.delete(resultId);
  recordDemoBetResult(result);
};

const getPlinkoBetCurrency = (): PlinkoBetResult['currency'] => {
  const { currency, currencyDecimals } = useMainStore.getState();

  return {
    code: currency,
    decimals: currencyDecimals,
  };
};

const simulateDemoBet = (form: PlinkoForm): PlinkoBetResult => {
  const { clientSeed, nonce, serverSeedHash } = useFairnessStore.getState();
  const { roundToCurrency, balance, currencyDecimals } =
    useMainStore.getState();
  const serverSeed = fairnessService.getDemoServerSeed();
  const roll = rollPlinko(serverSeed, clientSeed, nonce, form.rows);
  const odds = createPlinkoOdds();
  const multiplier = odds.getMultiplier(form.rows, form.risk, roll.bucketIndex);
  const betAmount = roundToCurrency(form.betAmount);
  const profit = calculateProfitOnWin(
    betAmount,
    multiplier,
    currencyDecimals,
    PLINKO_MULTIPLIER_DECIMALS,
  );
  const cashOut = roundToCurrency(betAmount + profit);
  const nextBalance = roundToCurrency(balance - betAmount + cashOut);
  const won = cashOut >= betAmount;

  useFairnessStore.getState().setNonce(nonce + 1);

  const result: PlinkoBetResult = {
    id: nanoid(),
    gameId: PLINKO_GAME_ID,
    status: won ? 'won' : 'lost',
    balance: nextBalance,
    betAmount,
    cashOut,
    createdAt: Date.now(),
    currency: getPlinkoBetCurrency(),
    fairness: {
      serverSeedHash,
      serverSeed,
      clientSeed,
      nonce,
    },
    gameData: {
      rows: form.rows,
      risk: form.risk,
      path: roll.path,
      bucketIndex: roll.bucketIndex,
      multiplier,
    },
  };

  pendingDemoBetResults.set(result.id, result);

  return result;
};

class PlinkoGameService {
  placeBet(form: PlinkoForm): Promise<PlinkoBetResult> {
    if (useMainStore.getState().isDemo) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(simulateDemoBet(form));
        }, 1);
      });
    }

    const request: PlinkoPlaceBetRequest = {
      requestId: nanoid(),
      betAmount: form.betAmount,
      currency: getPlinkoBetCurrency(),
      gameData: {
        rows: form.rows,
        risk: form.risk,
      },
    };

    return socketService.emit<PlinkoBetResult, PlinkoPlaceBetRequest>(
      WS_PLINKO_PLACE_BET,
      request,
    );
  }

  async loadHistory(cursor?: string): Promise<GetBetHistoryResponse> {
    if (useMainStore.getState().isDemo) {
      return { items: [...demoBetHistory].reverse() };
    }

    const request: GetBetHistoryRequest = {
      gameId: PLINKO_GAME_ID,
      ...(cursor ? { cursor } : {}),
    };

    return socketService.emit<GetBetHistoryResponse, GetBetHistoryRequest>(
      WS_SESSION_GET_BET_HISTORY,
      request,
    );
  }
}

export const plinkoGameService = new PlinkoGameService();
