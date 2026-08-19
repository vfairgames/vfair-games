import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import {
  type AutoBetAdjustmentMode,
  useMainStore,
} from '@vfair/games-web-shell';

import { minesGameService } from '../services/mines-game.service';
import { minesSoundService } from '../services/mines-sound.service';
import { useMinesGameStore } from '../store/mines-game-store';
import { minesQueryKeys } from './mines-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

type AutoBetAdjustment = {
  mode: AutoBetAdjustmentMode;
  percent: number;
};

const AUTO_BET_INSTANT_MIN_DELAY_MS = 100;
const AUTO_BET_DELAY_PADDING_MS = 100;
const AUTO_BET_BOARD_CLEAR_MS = 500;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const clampBetAmount = (
  value: number,
  minBet: number,
  maxBet: number,
  roundToCurrency: (value: number) => number,
): number => {
  const rounded = roundToCurrency(value);
  return Math.min(maxBet, Math.max(minBet, rounded));
};

const adjustBetAmountAfterResult = ({
  won,
  currentBetAmount,
  initialBetAmount,
  onWin,
  onLoss,
  minBet,
  maxBet,
  roundToCurrency,
}: {
  won: boolean;
  currentBetAmount: number;
  initialBetAmount: number;
  onWin: AutoBetAdjustment;
  onLoss: AutoBetAdjustment;
  minBet: number;
  maxBet: number;
  roundToCurrency: (value: number) => number;
}): number => {
  const adjustment = won ? onWin : onLoss;

  if (adjustment.mode === 'reset') {
    return clampBetAmount(initialBetAmount, minBet, maxBet, roundToCurrency);
  }

  const adjusted = currentBetAmount * (1 + adjustment.percent / 100);
  return clampBetAmount(adjusted, minBet, maxBet, roundToCurrency);
};

const shouldStopAutoBetSession = ({
  sessionProfit,
  stopOnLoss,
  stopOnProfit,
}: {
  sessionProfit: number;
  stopOnLoss: number;
  stopOnProfit: number;
}): boolean =>
  (stopOnLoss > 0 && sessionProfit <= -stopOnLoss) ||
  (stopOnProfit > 0 && sessionProfit >= stopOnProfit);

const decrementAutoBetCount = (): boolean => {
  const count = useMinesGameStore.getState().form.autoBetCount;

  if (count === 0) {
    return true;
  }

  const nextCount = count - 1;
  useMinesGameStore.getState().patchForm({ autoBetCount: nextCount });
  return nextCount > 0;
};

const getAutoBetDelayMs = (): number => {
  const { betResultTransitionMs } = useMinesGameStore.getState();

  return betResultTransitionMs === 0
    ? AUTO_BET_INSTANT_MIN_DELAY_MS
    : betResultTransitionMs;
};

const runAutoBetSession = async (shouldStop: {
  current: boolean;
}): Promise<void> => {
  let nextBetAt = 0;
  let hasPlayedBetSound = false;

  const {
    balance: startBalance,
    minBet,
    maxBet,
    roundToCurrency,
  } = useMainStore.getState();
  const initialBetAmount = useMinesGameStore.getState().form.betAmount;
  const selectedTiles = [...useMinesGameStore.getState().selectedTiles];

  try {
    while (!shouldStop.current) {
      const waitMs = nextBetAt - Date.now();

      if (waitMs > 0) {
        await sleep(waitMs);

        if (shouldStop.current) {
          return;
        }
      }

      assertSufficientBalance();

      if (!hasPlayedBetSound) {
        minesSoundService.playBet();
        hasPlayedBetSound = true;
      }

      useMinesGameStore.getState().clearBoard({ keepSelection: true });

      const boardClearMs =
        useMinesGameStore.getState().betResultTransitionMs === 0
          ? 0
          : AUTO_BET_BOARD_CLEAR_MS;

      if (boardClearMs > 0) {
        await sleep(boardClearMs);

        if (shouldStop.current) {
          return;
        }
      }

      const form = useMinesGameStore.getState().form;
      const result = await minesGameService.placeAutoRound(form, selectedTiles);

      applyBetSuccess(result);

      nextBetAt = Date.now() + getAutoBetDelayMs() + AUTO_BET_DELAY_PADDING_MS;

      const sessionProfit = result.balance - startBalance;

      if (
        shouldStopAutoBetSession({
          sessionProfit,
          stopOnLoss: form.stopOnLoss,
          stopOnProfit: form.stopOnProfit,
        })
      ) {
        return;
      }

      const nextBetAmount = adjustBetAmountAfterResult({
        won: result.status === 'won',
        currentBetAmount: form.betAmount,
        initialBetAmount,
        onWin: { mode: form.onWinMode, percent: form.onWinPercent },
        onLoss: { mode: form.onLossMode, percent: form.onLossPercent },
        minBet,
        maxBet,
        roundToCurrency,
      });

      if (nextBetAmount !== form.betAmount) {
        useMinesGameStore.getState().patchForm({ betAmount: nextBetAmount });
      }

      if (shouldStop.current || !decrementAutoBetCount()) {
        return;
      }
    }
  } finally {
    useMinesGameStore.getState().patchForm({ betAmount: initialBetAmount });
    useMinesGameStore.getState().clearBoard({
      keepSelection: true,
      keepLastWin: true,
    });
  }
};

export const usePlaceAutoBet = () => {
  const queryClient = useQueryClient();
  const shouldStopRef = useRef(false);
  const [isStopping, setIsStopping] = useState(false);

  const mutation = useMutation({
    mutationKey: minesQueryKeys.mutations.placeAutoBet,
    mutationFn: async () => {
      shouldStopRef.current = false;
      setIsStopping(false);
      await runAutoBetSession(shouldStopRef);
    },
    onError: handlePlaceBetError,
    onSettled: () => {
      setIsStopping(false);
      void queryClient.invalidateQueries({
        queryKey: minesQueryKeys.queries.betHistory,
      });
    },
  });

  const stop = () => {
    shouldStopRef.current = true;
    setIsStopping(true);
  };

  return { ...mutation, stop, isStopping };
};
