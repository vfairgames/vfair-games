import { nanoid } from 'nanoid';

import { DICE_GAME_ID } from '@vfair/game-contracts';
import { calculateProfitOnWin, isWon, rollDice } from '@vfair/game-math';
import type {
  DiceBetResult,
  DicePlaceBetRequest,
  GetBetHistoryRequest,
  GetBetHistoryResponse,
} from '@vfair/game-contracts';
import {
  WS_DICE_PLACE_BET,
  WS_SESSION_GET_BET_HISTORY,
} from '@vfair/game-contracts';
import {
  fairnessService,
  socketService,
  useFairnessStore,
  useMainStore,
} from '@vfair/games-web-shell';

import type { DiceForm } from '../store/dice-form';

const MAX_DEMO_BET_HISTORY = 30;
const demoBetHistory: DiceBetResult[] = [];

const recordDemoBetResult = (result: DiceBetResult): void => {
  demoBetHistory.push(result);

  if (demoBetHistory.length > MAX_DEMO_BET_HISTORY) {
    demoBetHistory.shift();
  }
};

const getDiceBetCurrency = (): DiceBetResult['currency'] => {
  const { currency, currencyDecimals } = useMainStore.getState();

  return {
    code: currency,
    decimals: currencyDecimals,
  };
};

const simulateDemoBet = (form: DiceForm): DiceBetResult => {
  const { clientSeed, nonce, serverSeedHash } = useFairnessStore.getState();
  const serverSeed = fairnessService.getDemoServerSeed();
  const rolledValue = rollDice(serverSeed, clientSeed, nonce);
  const won = isWon({
    gameMode: form.gameMode,
    rolledValue,
    sliderValue: form.sliderValue,
  });

  useFairnessStore.getState().setNonce(nonce + 1);

  const { balance, roundToCurrency, currencyDecimals } =
    useMainStore.getState();
  const currency = getDiceBetCurrency();
  const betAmount = roundToCurrency(form.betAmount);
  const nextBalance = won
    ? roundToCurrency(
        balance +
          calculateProfitOnWin(betAmount, form.multiplier, currencyDecimals),
      )
    : roundToCurrency(balance - betAmount);

  const cashOut = won
    ? roundToCurrency(
        betAmount +
          calculateProfitOnWin(betAmount, form.multiplier, currencyDecimals),
      )
    : 0;

  const result: DiceBetResult = {
    id: nanoid(),
    gameId: DICE_GAME_ID,
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
      rolledValue,
      sliderValue: form.sliderValue,
      gameMode: form.gameMode,
      multiplier: won ? form.multiplier : 0,
      winChance: form.winChance,
    },
  };

  recordDemoBetResult(result);

  return result;
};

class DiceGameService {
  placeBet(form: DiceForm): Promise<DiceBetResult> {
    if (useMainStore.getState().isDemo) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(simulateDemoBet(form));
        }, 1);
      });
    }

    const request: DicePlaceBetRequest = {
      requestId: nanoid(),
      betAmount: form.betAmount,
      currency: getDiceBetCurrency(),
      gameData: {
        sliderValue: form.sliderValue,
        gameMode: form.gameMode,
        multiplier: form.multiplier,
        winChance: form.winChance,
      },
    };

    return socketService.emit<DiceBetResult, DicePlaceBetRequest>(
      WS_DICE_PLACE_BET,
      request,
    );
  }

  async loadHistory(cursor?: string): Promise<GetBetHistoryResponse> {
    if (useMainStore.getState().isDemo) {
      return { items: [...demoBetHistory].reverse() };
    }

    const request: GetBetHistoryRequest = {
      gameId: DICE_GAME_ID,
      ...(cursor ? { cursor } : {}),
    };

    return socketService.emit<GetBetHistoryResponse, GetBetHistoryRequest>(
      WS_SESSION_GET_BET_HISTORY,
      request,
    );
  }
}

export const diceGameService = new DiceGameService();
