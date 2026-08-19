import { nanoid } from 'nanoid';

import {
  calculateProfitOnWin,
  drawKenoNumbers,
  KENO_MULTIPLIER_DECIMALS,
} from '@vfair/game-math';
import {
  KENO_GAME_ID,
  type GetBetHistoryRequest,
  type GetBetHistoryResponse,
  type KenoBetResult,
  type KenoPlaceBetRequest,
  WS_KENO_PLACE_BET,
  WS_SESSION_GET_BET_HISTORY,
} from '@vfair/game-contracts';
import {
  fairnessService,
  socketService,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import type { KenoForm } from '../store/keno-form';
import { useKenoGameStore } from '../store/keno-game-store';

const MAX_DEMO_BET_HISTORY = 30;
const demoBetHistory: KenoBetResult[] = [];

const recordDemoBetResult = (result: KenoBetResult): void => {
  demoBetHistory.push(result);

  if (demoBetHistory.length > MAX_DEMO_BET_HISTORY) {
    demoBetHistory.shift();
  }
};

const getKenoBetCurrency = (): KenoBetResult['currency'] => {
  const { currency, currencyDecimals } = useMainStore.getState();

  return {
    code: currency,
    decimals: currencyDecimals,
  };
};

const simulateDemoBet = (form: KenoForm, picks: number[]): KenoBetResult => {
  const { clientSeed, nonce, serverSeedHash } = useFairnessStore.getState();
  const serverSeed = fairnessService.getDemoServerSeed();
  const drawnNumbers = drawKenoNumbers(serverSeed, clientSeed, nonce);
  const kenoOdds = useKenoGameStore.getState().kenoOdds;
  const normalizedPicks = kenoOdds.normalizePicks(picks);
  const hitCount = kenoOdds.countHits(normalizedPicks, drawnNumbers);
  const multiplier = kenoOdds.getMultiplier(
    normalizedPicks.length,
    form.risk,
    hitCount,
  );
  const { balance, roundToCurrency, currencyDecimals } =
    useMainStore.getState();
  const currency = getKenoBetCurrency();
  const betAmount = roundToCurrency(form.betAmount);
  const profit = calculateProfitOnWin(
    betAmount,
    multiplier,
    currencyDecimals,
    KENO_MULTIPLIER_DECIMALS,
  );
  const cashOut = roundToCurrency(betAmount + profit);
  const nextBalance = roundToCurrency(balance - betAmount + cashOut);
  const won = cashOut >= betAmount;

  useFairnessStore.getState().setNonce(nonce + 1);

  const result: KenoBetResult = {
    id: nanoid(),
    gameId: KENO_GAME_ID,
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
      picks: normalizedPicks,
      risk: form.risk,
      drawnNumbers,
      hitCount,
      multiplier,
    },
  };

  recordDemoBetResult(result);

  return result;
};

class KenoGameService {
  placeBet(form: KenoForm, picks: number[]): Promise<KenoBetResult> {
    const kenoOdds = useKenoGameStore.getState().kenoOdds;
    const normalizedPicks = kenoOdds.normalizePicks(picks);

    if (useMainStore.getState().isDemo) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(simulateDemoBet(form, normalizedPicks));
        }, 1);
      });
    }

    const request: KenoPlaceBetRequest = {
      requestId: nanoid(),
      betAmount: form.betAmount,
      currency: getKenoBetCurrency(),
      gameData: {
        picks: normalizedPicks,
        risk: form.risk,
      },
    };

    return socketService.emit<KenoBetResult, KenoPlaceBetRequest>(
      WS_KENO_PLACE_BET,
      request,
    );
  }

  async loadHistory(cursor?: string): Promise<GetBetHistoryResponse> {
    if (useMainStore.getState().isDemo) {
      return { items: [...demoBetHistory].reverse() };
    }

    const request: GetBetHistoryRequest = {
      gameId: KENO_GAME_ID,
      ...(cursor ? { cursor } : {}),
    };

    return socketService.emit<GetBetHistoryResponse, GetBetHistoryRequest>(
      WS_SESSION_GET_BET_HISTORY,
      request,
    );
  }
}

export const kenoGameService = new KenoGameService();
