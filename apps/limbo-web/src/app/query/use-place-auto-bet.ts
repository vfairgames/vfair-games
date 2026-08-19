import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import {
  type AutoBetAdjustmentMode,
  useMainStore,
} from '@vfair/games-web-shell';

import { limboGameService } from '../services/limbo-game.service';
import { limboSoundService } from '../services/limbo-sound.service';
import { useLimboGameStore } from '../store/limbo-game-store';
import { limboQueryKeys } from './limbo-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

type AutoBetAdjustment = {
  mode: AutoBetAdjustmentMode;
  percent: number;
};

export const AUTO_BET_INSTANT_MIN_DELAY_MS = 100;
export const AUTO_BET_DELAY_PADDING_MS = 100;

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
}): boolean => {
  if (stopOnLoss > 0 && sessionProfit <= -stopOnLoss) {
    return true;
  }

  if (stopOnProfit > 0 && sessionProfit >= stopOnProfit) {
    return true;
  }

  return false;
};

const decrementAutoBetCount = (): boolean => {
  const count = useLimboGameStore.getState().form.autoBetCount;

  if (count === 0) {
    return true;
  }

  const nextCount = count - 1;
  useLimboGameStore.getState().patchForm({ autoBetCount: nextCount });
  return nextCount > 0;
};

export const runAutoBetSession = async (shouldStop: {
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
  const initialBetAmount = useLimboGameStore.getState().form.betAmount;

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
        limboSoundService.playBet();
        hasPlayedBetSound = true;
      }

      const form = useLimboGameStore.getState().form;
      const result = await limboGameService.placeBet(form);

      applyBetSuccess(result);

      const betResultTransitionMs =
        useLimboGameStore.getState().betResultTransitionMs;
      const autoBetDelayMs =
        betResultTransitionMs === 0
          ? AUTO_BET_INSTANT_MIN_DELAY_MS
          : betResultTransitionMs;

      nextBetAt = Date.now() + autoBetDelayMs + AUTO_BET_DELAY_PADDING_MS;

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
        useLimboGameStore.getState().patchForm({ betAmount: nextBetAmount });
      }

      if (shouldStop.current || !decrementAutoBetCount()) {
        return;
      }
    }
  } finally {
    useLimboGameStore.getState().patchForm({ betAmount: initialBetAmount });
  }
};

export const usePlaceAutoBet = () => {
  const queryClient = useQueryClient();
  const shouldStopRef = useRef(false);
  const [isStopping, setIsStopping] = useState(false);

  const mutation = useMutation({
    mutationKey: limboQueryKeys.mutations.placeAutoBet,
    mutationFn: async () => {
      shouldStopRef.current = false;
      setIsStopping(false);
      await runAutoBetSession(shouldStopRef);
    },
    onError: handlePlaceBetError,
    onSettled: () => {
      setIsStopping(false);
      void queryClient.invalidateQueries({
        queryKey: limboQueryKeys.queries.betHistory,
      });
    },
  });

  const stop = () => {
    shouldStopRef.current = true;
    setIsStopping(true);
  };

  return { ...mutation, stop, isStopping };
};
