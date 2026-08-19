import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { plinkoGameService } from '../services/plinko-game.service';
import { plinkoSoundService } from '../services/plinko-sound.service';
import {
  usePlinkoGameStore,
  waitForPlinkoAnimationComplete,
} from '../store/plinko-game-store';
import { plinkoQueryKeys } from './plinko-query-keys';
import {
  applyBetSuccess,
  assertSufficientBalance,
  handlePlaceBetError,
} from './place-bet-utils';

const AUTO_BET_INSTANT_MIN_DELAY_MS = 100;
const AUTO_BET_DELAY_PADDING_MS = 280;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const decrementAutoBetCount = (): boolean => {
  const count = usePlinkoGameStore.getState().form.autoBetCount;

  if (count === 0) {
    return true;
  }

  const nextCount = count - 1;
  usePlinkoGameStore.getState().patchForm({ autoBetCount: nextCount });
  return nextCount > 0;
};

const runAutoBetSession = async (shouldStop: {
  current: boolean;
}): Promise<void> => {
  let nextBetAt = 0;
  let hasPlayedBetSound = false;
  const initialBetAmount = usePlinkoGameStore.getState().form.betAmount;

  try {
    while (!shouldStop.current) {
      const waitMs = nextBetAt - Date.now();

      if (waitMs > 0) {
        await sleep(waitMs);

        if (shouldStop.current) {
          break;
        }
      }

      assertSufficientBalance();

      if (!hasPlayedBetSound) {
        plinkoSoundService.playBet();
        hasPlayedBetSound = true;
      }

      const form = usePlinkoGameStore.getState().form;
      const result = await plinkoGameService.placeBet(form);

      applyBetSuccess(result);

      const autoBetDelayMs = usePlinkoGameStore.getState().isInstantBet
        ? AUTO_BET_INSTANT_MIN_DELAY_MS
        : AUTO_BET_DELAY_PADDING_MS;

      nextBetAt = Date.now() + autoBetDelayMs;

      if (shouldStop.current || !decrementAutoBetCount()) {
        break;
      }
    }

    await waitForPlinkoAnimationComplete();
  } finally {
    usePlinkoGameStore.getState().patchForm({ betAmount: initialBetAmount });
  }
};

export const usePlaceAutoBet = () => {
  const shouldStopRef = useRef(false);
  const [isStopping, setIsStopping] = useState(false);

  const mutation = useMutation({
    mutationKey: plinkoQueryKeys.mutations.placeAutoBet,
    mutationFn: async () => {
      shouldStopRef.current = false;
      setIsStopping(false);
      await runAutoBetSession(shouldStopRef);
    },
    onError: handlePlaceBetError,
    onSettled: () => {
      setIsStopping(false);
    },
  });

  const stop = () => {
    shouldStopRef.current = true;
    setIsStopping(true);
  };

  return { ...mutation, stop, isStopping };
};
